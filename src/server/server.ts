import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as fs from 'fs-extra';
import gql from 'graphql-tag';
import * as path from 'path';
import * as request from 'request-promise-native';
import {GitHub} from '../gql';
import {ViewerPullRequestsQuery} from '../gql-types';

// tslint:disable-next-line:no-require-imports
const ansi = require('ansi-escape-sequences');

const app = express();
const github = new GitHub();

const prsQuery = gql`
query ViewerPullRequests {
	viewer {
    pullRequests(last: 10, states: [OPEN]) {
      nodes {
        ...fullPR
      }
    }
  }
  incomingReviews: search(type: ISSUE, query: "is:open is:pr review-requested:samuelli archived:false", last: 10) {
    nodes {
      __typename
      ... on PullRequest {
        ...fullPR
      }
    }
  }
  rateLimit {
    cost
    limit
    remaining
    resetAt
    nodeCount
  }
}

fragment userFields on User {
  avatarUrl
  login
  resourcePath
  url
}

fragment fullPR on PullRequest {
  author {
    ...userFields
  }
  title
  repository {
    nameWithOwner
  }
  state
  createdAt
  lastEditedAt
  url
  reviews(last: 10) {
    totalCount
    nodes {
      state
      author {
        ...userFields
      }
    }
  }
  reviewRequests(last: 2) {
    totalCount
    nodes {
      requestedReviewer {
        __typename
        ... on User {
          ...userFields
        }
      }
    }
  }
	commits(last: 1) {
    nodes {
      commit {
        status {
          contexts {
            id
            context
            state
            createdAt
          }
          state
        }
      }
    }
  }
}`;

async function fetchUserData(token: string) {
  const result = await github.query<ViewerPullRequestsQuery>(
      {query: prsQuery, fetchPolicy: 'network-only', context: {token}});
  return result.data;
}

app.use(cookieParser());

/**
 * Merges two objects that have the same structure. It always folds into the
 * first argument and always concats any array that is found in the tree.
 */
export function mergeObjects<
    T extends {[key:string]: {}}>(
    left: T,
    right: T): T {
  if (Object.keys(left).length === 0) {
    return right;
  }

  for (const key of Object.keys(left)) {
    const value = left[key];
    if (typeof value !== typeof right[key]) {
      throw new Error('Type mismatch between objects');
    } else if (Array.isArray(value)) {
      left[key] = value.concat(right[key]);
      delete right[key];
    } else if (typeof value === 'object') {
      left[key] = mergeObjects(value, right[key]);
    }
  }

  return left;
}

/**
 * This endpoint exposes test data that never hits the GitHub API that can be
 * used to test the UI. The `dashes` folder contains dumps of data generated
 * from the /dash.json endpoint. This endpoint will then collapse all that data
 * into a single response.
 */
app.get('/test-dash.json', async (_req, res) => {
  const testDir = path.join(__dirname, '../../src/test/dashes');
  const dir = await fs.readdir(testDir);
  const files = [];
  for (const file of dir) {
    files.push(await fs.readFile(path.join(testDir, file)));
  }

  let result = {};
  for (const file of files) {
    result = mergeObjects(result, JSON.parse(file.toString()));
  }

  res.send(JSON.stringify(result, null, 2));
});

app.get('/dash.json', async (req, res) => {
  const token = req.cookies['id'];
  const userData = await fetchUserData(token);
  res.header('content-type', 'application/json');
  res.send(JSON.stringify(userData, null, 2));
});

app.post('/login', bodyParser.text(), async (req, res) => {
  if (!req.body) {
    res.sendStatus(400);
    return;
  }

  const postResp = await request.post({
    url: 'https://github.com/login/oauth/access_token',
    headers: {'Accept': 'application/json'},
    form: {
      'client_id': '23b7d82aec29a3a1a2a8',
      'client_secret': process.env.GITHUB_CLIENT_SECRET,
      'code': req.body,
    },
    json: true,
  });

  if (postResp['error']) {
    console.log(postResp);
    res.sendStatus(500);
    return;
  }

  res.cookie('id', postResp['access_token'], {httpOnly: true});
  res.end();
});

app.use('/lit-html', express.static('node_modules/lit-html'));
app.use(express.static('src/server/static'));

// Don't actually start the server when running inside of a test.
if (!module.parent) {
  const server = app.listen(8080, 'localhost', () => {
    const addr = server.address();
    let urlHost = addr.address;
    if (addr.family === 'IPv6') {
      urlHost = '[' + urlHost + ']';
    }
    console.log();
    console.log(ansi.format('[blue bold]{project health server} listening'));
    console.log(ansi.format(`[blue]{http://${urlHost}:${addr.port}}`));
    console.log();
  });
}
