import * as ava from 'ava';
import * as crypto from 'crypto';
import * as fsExtra from 'fs-extra';
import * as http from 'http';
import * as path from 'path';
import * as request from 'request';

const projectRoot = path.join(__dirname, '..', '..');
const replayRoot = path.join(projectRoot, '..', 'replays');
const githubApiUrl = 'https://api.github.com/graphql';
const githubJsonUrl = 'https://api.github.com';
const timeout = 1000 * 10;

// We want to log something to make it obvious when we're recording new test
// data from the live API, but only once per process.
let recordingLogged = false;

/**
 * Start a local HTTP server that will record or replay responses from the
 * GitHub API. Return the server and a client pointed at it.
 *
 * When the RECORD environment variable is "true", the server will proxy all
 * requests to the live GitHub API and save the responses to disk at
 * "replayRoot/testName/queryName-queryVarsHash". Otherwise, the responses are
 * read back from those files.
 */
export async function startTestReplayServer(
    t: ava.ExecutionContext,
    overrideTitle?: string): Promise<{server: http.Server, url: string}> {
  const record = process.env.RECORD === 'true';

  // Kind of weirdly, t.title will include the name of the current function
  // plus " for " as a prefix. Get the original name instead.
  const testTitle =
      overrideTitle ? overrideTitle : t.title.replace(/^[\w\s]+ hook for /, '');

  // We don't want spaces in our directory name.
  const replayDir = path.join(replayRoot, testTitle.replace(/\s+/g, '-'));

  if (record) {
    const tokensPath = path.join(projectRoot, '..', 'tokens.json');
    if (!await fsExtra.pathExists(tokensPath)) {
      throw new Error('Missing tokens.json with test tokens.');
    }

    if (!recordingLogged) {
      console.info('RECORDING 🔴  💾\n');
      recordingLogged = true;
    }
    await fsExtra.emptyDir(replayDir);
  }

  function router(req: http.IncomingMessage, res: http.ServerResponse) {
    if (req.method === 'POST' && req.url === '/') {
      gqlHandler(req, res);
    } else {
      jsonHandler(req, res);
    }
  }

  async function sendReplayFile(res: http.ServerResponse, replayFile: string) {
    let replayBody;
    try {
      replayBody = await fsExtra.readFile(replayFile);
    } catch (e) {
      res.statusCode = 500;
      res.statusMessage = 'No replay file: ' + replayFile;
      res.end();
      return;
    }
    res.statusCode = 200;
    res.end(replayBody);
  }

  function gqlHandler(req: http.IncomingMessage, res: http.ServerResponse) {
    let body = '';
    req.on('readable', () => body += req.read() || '');

    req.on('end', async () => {
      const query = JSON.parse(body);
      const replayFile = path.join(
          replayDir,
          `${query.operationName}-${fingerprintQueryVars(query.variables)}`);

      if (record) {
        // Don't forward the host header, it's for the wrong host.
        const headers = Object.assign({}, req.headers);
        delete headers['host'];

        const opts = {
          url: githubApiUrl,
          body,
          timeout,
          headers,
          gzip: true,
        };
        const proxyRes = request.post(opts, async (err, _res, body) => {
          if (!err) {
            // Re-indent the JSON so that it's easier to read in diffs.
            const indentedResult = JSON.stringify(JSON.parse(body), null, 2);
            await fsExtra.writeFile(replayFile, indentedResult);
          }
        });
        proxyRes.pipe(res);

      } else {
        await sendReplayFile(res, replayFile);
      }
    });
  }

  async function jsonHandler(
      req: http.IncomingMessage, res: http.ServerResponse) {
    // Replace file delimiters with arbitary hash character to create a flat
    // file structure based on the requested URLs.
    const replayFile =
        path.join(replayDir, (req.url || '').replace(/\//g, '#'));

    if (record) {
      // Don't forward the host header, it's for the wrong host.
      const headers = Object.assign({}, req.headers);
      delete headers['host'];

      const opts = {
        url: githubJsonUrl + req.url,
        timeout,
        headers,
        gzip: true,
      };
      const proxyRes = request.get(opts, async (err, res, body) => {
        if (!err && res.statusCode === 200) {
          // Re-indent the JSON so that it's easier to read in diffs.
          const indentedResult = JSON.stringify(JSON.parse(body), null, 2);
          await fsExtra.writeFile(replayFile, indentedResult);
        }
      });
      proxyRes.pipe(res);
    } else {
      await sendReplayFile(res, replayFile);
    }
  }

  return new Promise<{server: http.Server, url: string}>((resolve) => {
    const server = http.createServer(router);
    server.listen(/* random */ 0, '127.0.0.1', () => {
      const {address, port} = server.address();
      const url = `http://${address}:${port}`;

      resolve({server, url});
    });
  });
}

/**
 * Hash the given GitHub GraphQL query variables object to create a fingerprint
 * that can be used for creating a unique, deterministic replay filename.
 */
function fingerprintQueryVars(vars: queryVars): string {
  // SHA1 is good enough for a fingerprint.
  const hash = crypto.createHash('sha1');
  // Don't rely on JSON serialization being deterministic; properties can be
  // serializated in any order (in V8 it follows property creation order).
  for (const key of Object.keys(vars).sort()) {
    const val = vars[key];
    // The difference between null, undefined, and omitted is not significant.
    if (val === null || val === undefined) {
      continue;
    }
    hash.update(key);
    hash.update('\u241F');  // UNIT SEPARATOR
    hash.update(val);
    hash.update('\u241E');  // RECORD SEPARATOR
  }
  return hash.digest('hex');
}

type queryVars = {
  [key: string]: any  // tslint:disable-line:no-any
};
