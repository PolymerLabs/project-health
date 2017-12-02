import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as request from 'request-promise-native';

// tslint:disable-next-line:no-require-imports
const ansi = require('ansi-escape-sequences');

import gql from 'graphql-tag';

import {GitHub} from '../gql';
import {ViewerPullRequestsQuery} from '../gql-types';

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

app.get('/dash.json', async (req, res) => {
  const token = req.cookies['id'];
  const userData = await fetchUserData(token);
  res.header('content-type', 'application/json');
  res.send(JSON.stringify(userData, null, 2));
});

app.post('/login', bodyParser.text(), async (req, res) => {
  if (!req.body) {
    res.sendStatus(400);
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

  res.cookie('id', postResp['access_token'], {httpOnly: true});
  res.end();
});

app.use('/lit-html', express.static('node_modules/lit-html'));
app.use(express.static('src/server/static'));

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
