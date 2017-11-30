import * as express from 'express';
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

async function fetchUserData() {
  const result = await github.query<ViewerPullRequestsQuery>(
      {query: prsQuery, fetchPolicy: 'network-only'});
  return result.data;
}

app.get('/dash.json', async (_req, res) => {
  const userData = await fetchUserData();
  res.header('content-type', 'application/json');
  res.send(JSON.stringify(userData, null, 2));
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
