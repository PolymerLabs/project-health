import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as fs from 'fs-extra';
import gql from 'graphql-tag';
import {Server} from 'http';
import * as path from 'path';
import * as request from 'request-promise-native';

import {GitHub} from './gql';
import {ViewerLoginQuery, ViewerPullRequestsQuery} from './gql-types';

const app = express();
const github = new GitHub();

const viewerLoginQuery = gql`
query ViewerLogin {
  viewer {
    login
  }
}
`;

const prsQuery = gql`
query ViewerPullRequests($query: String!) {
	viewer {
    pullRequests(last: 10, states: [OPEN]) {
      nodes {
        ...fullPR
      }
    }
  }
  incomingReviews: search(type: ISSUE, query: $query, last: 10) {
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
  number
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

interface PullRequest {
  repository: string;
  title: string;
  number: number;
  avatarUrl: string;
  approvedBy: string[];
  changesRequestedBy: string[];
  commentedBy: string[];
  pendingReviews: string[];
  statusState: 'passed'|'pending'|'failed';
}

interface DashResponse {
  prs: PullRequest[];
}

async function fetchUserData(token: string): Promise<DashResponse> {
  const loginResult = await github.query<ViewerLoginQuery>(
      {query: viewerLoginQuery, context: {token}});
  const login = loginResult.data.viewer.login;
  const incomingReviewsQuery =
      `is:open is:pr review-requested:${login} archived:false`;

  const result = await github.query<ViewerPullRequestsQuery>({
    query: prsQuery,
    variables: {query: incomingReviewsQuery},
    fetchPolicy: 'network-only',
    context: {token}
  });
  const prs = [];
  for (const pr of result.data.viewer.pullRequests.nodes || []) {
    if (!pr) {
      continue;
    }
    const object: PullRequest = {
      repository: pr.repository.nameWithOwner,
      title: pr.title,
      number: pr.number,
      avatarUrl: '',
      approvedBy: [],
      changesRequestedBy: [],
      commentedBy: [],
      pendingReviews: [],
      statusState: 'passed',
    };
    if (pr.author && pr.author.__typename === 'User') {
      object.avatarUrl = pr.author.avatarUrl;
    }
    prs.push(object);
  }
  return {prs};
}

app.use(cookieParser());

/**
 * Merges two objects that have the same structure. It always folds into the
 * first argument and always concats any array that is found in the tree.
 */
export function mergeObjects<T extends {[key: string]: {}}>(
    left: T, right: T): T {
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
app.use(express.static('../client'));

const environment = process.env.NODE_ENV;
if (environment !== 'test') {
  const port = Number(process.env.PORT || '') || 8080;
  let server: Server;
  const printStatus = () => {
    const addr = server.address();
    let urlHost = addr.address;
    if (addr.family === 'IPv6') {
      urlHost = '[' + urlHost + ']';
    }
    console.log('project health server listening');
    console.log(`http://${urlHost}:${addr.port}`);
  };

  if (environment === 'production') {
    server = app.listen(port, printStatus);
  } else {
    server = app.listen(port, 'localhost', printStatus);
  }
}
