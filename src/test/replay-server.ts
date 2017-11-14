import * as ava from 'ava';
import * as crypto from 'crypto';
import * as fsExtra from 'fs-extra';
import * as http from 'http';
import * as path from 'path';
import * as request from 'request';

import {GitHub} from '../gql';

const replayRoot = path.join(__dirname, '..', '..', 'src', 'test', 'replays');
const githubApiUrl = 'https://api.github.com/graphql';
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
export async function startTestReplayServer(t: ava.TestContext):
    Promise<{server: http.Server, client: GitHub}> {
  const record = process.env.RECORD === 'true';

  // Kind of weirdly, t.title will include the name of the current function
  // plus " for " as a prefix. Get the original name instead.
  const testTitle = t.title.replace(/^\w+ for /, '');

  // We don't want spaces in our directory name.
  const replayDir = path.join(replayRoot, testTitle.replace(/\s+/g, '-'));

  if (record) {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN env var must be set when recording.');
    }
    if (!recordingLogged) {
      console.info('RECORDING 🔴  💾\n');
      recordingLogged = true;
    }
    await fsExtra.emptyDir(replayDir);
  }

  function handler(req: http.IncomingMessage, res: http.ServerResponse) {
    let body = '';
    req.on('readable', () => body += req.read() || '');

    req.on('end', async () => {
      const query = JSON.parse(body);
      const replayFile = path.join(
          replayDir,
          query.operationName + '-' + fingerprintQueryVars(query.variables));

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
    });
  }

  return new Promise<{server: http.Server, client: GitHub}>((resolve) => {
    const server = http.createServer(handler);
    server.listen(/* random */ 0, '127.0.0.1', () => {
      const {address, port} = server.address();
      const client = new GitHub(`http://${address}:${port}`);
      resolve({server, client});
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
    hash.update('\u241F');  // UNIT SEPERATOR
    hash.update(val);
    hash.update('\u241E');  // RECORD SEPERATOR
  }
  return hash.digest('hex');
}

type queryVars = {
  [key: string]: any  // tslint:disable-line:no-any
};
