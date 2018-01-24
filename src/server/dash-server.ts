import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import gql from 'graphql-tag';
import {Server} from 'http';
import * as path from 'path';
import * as request from 'request-promise-native';

import {DashResponse, IncomingPullRequest, OutgoingPullRequest, PullRequest, Review} from '../types/api';
import {prFieldsFragment, reviewFieldsFragment, ViewerLoginQuery, ViewerPullRequestsQuery} from '../types/gql-types';
import {GitHub} from '../utils/github';

import {PushSubscriptionModel} from './models/PushSubscriptionModel';

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
    const litPath = path.join(__dirname, '../../node_modules/lit-html');

    app.use(cookieParser());
    app.use('/node_modules/lit-html', express.static(litPath));
    app.use(express.static(path.join(__dirname, '../client')));

    app.get('/dash.json', this.handleDashJson.bind(this));
    app.post('/login', bodyParser.text(), this.handleLogin.bind(this));
    app.post(
        '/api/push-subscription/:action',
        bodyParser.json(),
        this.handlePushSubscription.bind(this));

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

  async handlePushSubscription(req: express.Request, res: express.Response) {
    if (!req.body) {
      res.sendStatus(400);
      return;
    }

    // TODO: We shouldn't make this request for Github login repeatedly.
    const token = req.cookies['id'];
    const loginResult = await this.github.query<ViewerLoginQuery>({
      query: viewerLoginQuery,
      fetchPolicy: 'network-only',
      context: {token},
    });
    const login = loginResult.data.viewer.login;

    if (!login) {
      res.sendStatus(400);
      return;
    }

    if (req.params.action === 'add') {
      this.pushSubscriptions.addPushSubscription(
          login, req.body.subscription, req.body.supportedContentEncodings);
    } else if (req.params.action === 'remove') {
      this.pushSubscriptions.removePushSubscription(
          login, req.body.subscription);
    } else {
      res.sendStatus(400);
      return;
    }

    res.end();
  }

  async handleDashJson(req: express.Request, res: express.Response) {
    const token = req.cookies['id'];
    const loginResult = await this.github.query<ViewerLoginQuery>({
      query: viewerLoginQuery,
      fetchPolicy: 'network-only',
      context: {token},
    });
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
      variables: {login, incomingReviewsQuery},
      fetchPolicy: 'network-only',
      context: {token}
    });
    const outgoingPrs = [];
    const incomingPrs = [];
    if (result.data.user) {
      for (const pr of result.data.user.pullRequests.nodes || []) {
        if (!pr) {
          continue;
        }

        const outgoingPr: OutgoingPullRequest = {
          ...prFieldsToResult(pr),
          reviews: [],
          reviewRequests: [],
        };
        if (pr.author && pr.author.__typename === 'User') {
          outgoingPr.author = pr.author.login;
          outgoingPr.avatarUrl = pr.author.avatarUrl;
        }

        if (pr.reviewRequests) {
          for (const request of pr.reviewRequests.nodes || []) {
            if (!request || !request.requestedReviewer ||
                request.requestedReviewer.__typename !== 'User') {
              continue;
            }
            outgoingPr.reviewRequests.push(request.requestedReviewer.login);
          }
        }

        if (pr.reviews && pr.reviews.nodes) {
          for (const review of pr.reviews.nodes) {
            if (!review) {
              continue;
            }

            outgoingPr.reviews.push(reviewFieldsToResult(review));
          }
          pr.reviews.nodes.map((review) => {
            if (!review) {
              return {};
            }
          });
        }

        outgoingPrs.push(outgoingPr);
      }

      // Incoming reviews
      for (const pr of result.data.incomingReviews.nodes || []) {
        if (!pr || pr.__typename !== 'PullRequest') {
          continue;
        }

        const incomingPr: IncomingPullRequest = {
          ...prFieldsToResult(pr),
          myReview: null,
        };

        incomingPrs.push(incomingPr);
      }
    }
    return {outgoingPrs, incomingPrs};
  }
}

/**
 * Converts a pull request GraphQL object to an API object.
 */
function prFieldsToResult(fields: prFieldsFragment): PullRequest {
  const pr: PullRequest = {
    repository: fields.repository.nameWithOwner,
    title: fields.title,
    createdAt: Date.parse(fields.createdAt),
    url: fields.url,
    avatarUrl: '',
    author: '',
  };

  if (fields.author && fields.author.__typename === 'User') {
    pr.author = fields.author.login;
    pr.avatarUrl = fields.author.avatarUrl;
  }

  return pr;
}

/**
 * Converts a review GraphQL object to an API object.
 */
function reviewFieldsToResult(fields: reviewFieldsFragment): Review {
  const review = {
    author: '',
    createdAt: Date.parse(fields.createdAt),
    reviewState: fields.state,
  };

  if (fields.author && fields.author.__typename === 'User') {
    review.author = fields.author.login;
  }

  return review;
}

const viewerLoginQuery = gql`
query ViewerLogin {
  viewer {
    login
  }
}
`;

const prsQuery = gql`
query ViewerPullRequests($login: String!, $incomingReviewsQuery: String!) {
	user(login: $login) {
    pullRequests(last: 10, states: [OPEN]) {
      nodes {
        ...prFields
        ...statusFields
        reviews(last: 10) {
          totalCount
          nodes {
            ...reviewFields
          }
        }
        reviewRequests(last: 2) {
          totalCount
          nodes {
            requestedReviewer {
              __typename
              ... on User {
                login
              }
            }
          }
        }
      }
    }
  }
  incomingReviews: search(type: ISSUE, query: $incomingReviewsQuery, last: 10) {
    nodes {
      __typename
      ... on PullRequest {
        ...prFields
        reviews(author: $login, last: 1) {
          nodes {
            ...reviewFields
          }
        }
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

fragment reviewFields on PullRequestReview {
  createdAt
  state
  author {
    login
  }
}

fragment prFields on PullRequest {
  repository {
    nameWithOwner
  }
  title
  url
  createdAt
  author {
    avatarUrl
    login
    url
  }
}

fragment statusFields on PullRequest {
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
