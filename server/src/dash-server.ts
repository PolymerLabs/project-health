import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import gql from 'graphql-tag';
import {Server} from 'http';
import * as path from 'path';
import * as request from 'request-promise-native';

import {DashResponse, PullRequest} from '../../api';

import {PushSubscriptionModel} from './models/PushSubscriptionModel';
import {GitHub} from './github';
import {ViewerLoginQuery, ViewerPullRequestsQuery} from './gql-types';

export class DashServer {
  private secrets: {
    GITHUB_CLIENT_ID: string,
    GITHUB_CLIENT_SECRET: string,
  };
  private github: GitHub;
  private app: express.Express;
  private pushSubscriptions: PushSubscriptionModel;

  constructor(github: GitHub, secrets: {
    GITHUB_CLIENT_ID: string,
    GITHUB_CLIENT_SECRET: string,
  }) {
    this.github = github;
    this.secrets = secrets;
    this.pushSubscriptions = new PushSubscriptionModel();

    const app = express();
    const litPath = path.join(__dirname, '../../client/node_modules/lit-html');

    app.use(cookieParser());
    app.use('/node_modules/lit-html', express.static(litPath));
    app.use(express.static(path.join(__dirname, '../../client')));

    app.get('/dash.json', this.handleDashJson.bind(this));
    app.post('/login', bodyParser.text(), this.handleLogin.bind(this));
    app.post('/api/push-subscription/add', bodyParser.json(), this.addPushSubscription.bind(this));

    this.app = app;
  }

  listen() {
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

    if (process.env.NODE_ENV === 'production') {
      server = this.app.listen(port, printStatus);
    } else {
      server = this.app.listen(port, 'localhost', printStatus);
    }
  }

  async handleLogin(req: express.Request, res: express.Response) {
    if (!req.body) {
      res.sendStatus(400);
      return;
    }
    const postResp = await request.post({
      url: 'https://github.com/login/oauth/access_token',
      headers: {'Accept': 'application/json'},
      form: {
        'client_id': this.secrets.GITHUB_CLIENT_ID,
        'client_secret': this.secrets.GITHUB_CLIENT_SECRET,
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
  }

  async addPushSubscription(req: express.Request, res: express.Response) {
    const token = req.cookies['id'];
    const loginResult = await this.github.query<ViewerLoginQuery>(
        {query: viewerLoginQuery, context: {token}});
    const login = loginResult.data.viewer.login;

    if (!req.body) {
      res.sendStatus(400);
      return;
    }

    // console.log(this.pushSubscriptions.addPushSubscription());
    this.pushSubscriptions.addPushSubscription(
      login,
      req.body.subscription,
      req.body.supportedContentEncodings
    );

    res.end();
  }

  async handleDashJson(req: express.Request, res: express.Response) {
    const token = req.cookies['id'];
    const loginResult = await this.github.query<ViewerLoginQuery>(
        {query: viewerLoginQuery, context: {token}});
    const login = loginResult.data.viewer.login;
    const userData = await this.fetchUserData(login, token);
    res.header('content-type', 'application/json');
    res.send(JSON.stringify(userData, null, 2));
  }

  async fetchUserData(login: string, token: string): Promise<DashResponse> {
    const incomingReviewsQuery =
        `is:open is:pr review-requested:${login} archived:false`;

    const result = await this.github.query<ViewerPullRequestsQuery>({
      query: prsQuery,
      variables: {login, query: incomingReviewsQuery},
      fetchPolicy: 'network-only',
      context: {token}
    });
    const prs = [];
    if (result.data.user) {
      for (const pr of result.data.user.pullRequests.nodes || []) {
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
    }
    return {prs};
  }
}

const viewerLoginQuery = gql`
query ViewerLogin {
  viewer {
    login
  }
}
`;

const prsQuery = gql`
query ViewerPullRequests($login: String!, $query: String!) {
	user(login: $login) {
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
