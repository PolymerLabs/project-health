import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import gql from 'graphql-tag';
import {Server} from 'http';
import * as path from 'path';
import * as request from 'request-promise-native';

import {DashResponse, IncomingPullRequest, OutgoingPullRequest, PullRequest, Review} from '../types/api';
import {prFieldsFragment, PullRequestReviewState, reviewFieldsFragment, ViewerPullRequestsQuery} from '../types/gql-types';
import {GitHub} from '../utils/github';

import {getRouter as getPushSubRouter} from './apis/push-subscription';
import {getRouter as getWebhookRouter} from './apis/webhook';
import {getLoginFromRequest} from './utils/login-from-request';

type DashSecrets = {
  GITHUB_CLIENT_ID: string; GITHUB_CLIENT_SECRET: string;
};

export class DashServer {
  private secrets: DashSecrets;
  private github: GitHub;
  private app: express.Express;

  constructor(github: GitHub, secrets: DashSecrets) {
    this.github = github;
    this.secrets = secrets;

    const app = express();
    const litPath = path.join(__dirname, '../../node_modules/lit-html');

    app.use(cookieParser());
    app.use('/node_modules/lit-html', express.static(litPath));
    app.use(express.static(path.join(__dirname, '../client')));

    app.get('/dash.json', this.handleDashJson.bind(this));
    app.post('/login', bodyParser.text(), this.handleLogin.bind(this));

    app.use('/api/push-subscription/', getPushSubRouter(this.github));
    app.use('/api/webhook/', getWebhookRouter());

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

  async handleDashJson(req: express.Request, res: express.Response) {
    const loginDetails = await getLoginFromRequest(this.github, req);
    if (!loginDetails) {
      res.send(401);
      return;
    }

    const userData =
        await this.fetchUserData(loginDetails.username, loginDetails.token);
    res.header('content-type', 'application/json');
    res.send(JSON.stringify(userData, null, 2));
  }

  async fetchUserData(login: string, token: string): Promise<DashResponse> {
    const openPrQuery = 'is:open is:pr archived:false';

    const viewerPrsResult = await this.github.query<ViewerPullRequestsQuery>({
      query: prsQuery,
      variables: {
        login,
        reviewRequestsQueryString: `review-requested:${login} ${openPrQuery}`,
        reviewedQueryString: `reviewed-by:${login} ${openPrQuery}`,
      },
      fetchPolicy: 'network-only',
      context: {token}
    });
    const outgoingPrs = [];
    const incomingPrs = [];
    if (viewerPrsResult.data.user) {
      for (const pr of viewerPrsResult.data.user.pullRequests.nodes || []) {
        if (!pr) {
          continue;
        }

        const outgoingPr: OutgoingPullRequest = {
          ...convertPrFields(pr),
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

            outgoingPr.reviews.push(convertReviewFields(review));
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
      for (const pr of viewerPrsResult.data.reviewRequests.nodes || []) {
        if (!pr || pr.__typename !== 'PullRequest') {
          continue;
        }

        const incomingPr: IncomingPullRequest = {
          ...convertPrFields(pr),
          myReview: null,
        };

        incomingPrs.push(incomingPr);
      }

      for (const pr of viewerPrsResult.data.reviewed.nodes || []) {
        if (!pr || pr.__typename !== 'PullRequest') {
          continue;
        }

        // Find relevant review.
        let relevantReview = null;
        if (pr.reviews && pr.reviews.nodes) {
          for (let i = pr.reviews.nodes.length - 1; i >= 0; i--) {
            const nextReview = pr.reviews.nodes[i];
            // Pending reviews have not been sent yet.
            if (!relevantReview && nextReview &&
                nextReview.state !== PullRequestReviewState.PENDING) {
              relevantReview = nextReview;
            } else if (
                relevantReview &&
                relevantReview.state === PullRequestReviewState.COMMENTED &&
                nextReview &&
                (nextReview.state === PullRequestReviewState.APPROVED ||
                 nextReview.state ===
                     PullRequestReviewState.CHANGES_REQUESTED)) {
              // Use last approved/changes requested if it exists.
              relevantReview = nextReview;
            }
          }
        }

        let myReview = null;
        if (relevantReview) {
          // Cast because inner type has less strict type for __typename.
          myReview =
              convertReviewFields(relevantReview as reviewFieldsFragment);
        }

        const reviewedPr: IncomingPullRequest = {
          ...convertPrFields(pr),
          myReview,
        };

        incomingPrs.push(reviewedPr);
      }
    }
    return {outgoingPrs, incomingPrs};
  }
}

/**
 * Converts a pull request GraphQL object to an API object.
 */
function convertPrFields(fields: prFieldsFragment): PullRequest {
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
function convertReviewFields(fields: reviewFieldsFragment): Review {
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

const prsQuery = gql`
query ViewerPullRequests($login: String!, $reviewRequestsQueryString: String!, $reviewedQueryString: String!) {
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
              ... on User {
                login
              }
            }
          }
        }
      }
    }
  }
  reviewRequests: search(type: ISSUE, query: $reviewRequestsQueryString, last: 10) {
    nodes {
      ... on PullRequest {
        ...prFields
      }
    }
  }
  reviewed: search(type: ISSUE, query: $reviewedQueryString, last: 10) {
    nodes {
      ... on PullRequest {
        ...prFields
        reviews(author: $login, last: 10) {
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
