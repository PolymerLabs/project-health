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
  const githubToken = process.env.GITHUB_TOKEN;

  // Kind of weirdly, t.title will include the name of the current function
  // plus " for " as a prefix. Get the original name instead.
  const testTitle = t.title.replace(/^\w+ for /, '');

  // We don't want spaces in our directory name.
  const replayDir = path.join(replayRoot, testTitle.replace(/\s+/g, '-'));

  if (record) {
    if (!githubToken) {
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
      const varsHash = crypto.createHash('sha1')
                           .update(JSON.stringify(query.variables))
                           .digest('hex');
      const replayFile =
          path.join(replayDir, query.operationName + '-' + varsHash);

      if (record) {
        const opts = {
          url: githubApiUrl,
          body,
          timeout,
          headers: {
            'Authorization': 'bearer ' + githubToken,
            'User-Agent': 'Project Health',
          },
        };
        const proxyRes = request.post(opts, async (err, res, body) => {
          if (!err) {
            await fsExtra.writeJSON(replayFile, {status: res.statusCode, body});
          }
        });
        proxyRes.pipe(res);

      } else {
        let replay;
        try {
          replay = await fsExtra.readJSON(replayFile);
        } catch (e) {
          res.statusCode = 500;
          res.statusMessage = 'No replay file: ' + replayFile;
          res.end();
          return;
        }
        res.statusCode = replay.status;
        res.end(replay.body);
      }
    });
  };

  return new Promise<{server: http.Server, client: GitHub}>((resolve) => {
    const server = http.createServer(handler);
    server.listen(/* random */ 0, '127.0.0.1', () => {
      const {address, port} = server.address();
      const client = new GitHub(`http://${address}:${port}`);
      resolve({server, client});
    });
  });
}
