import * as express from 'express';
import gql from 'graphql-tag';

import * as api from '../../types/api';
import {prFieldsFragment, PullRequestReviewState, reviewFieldsFragment, ViewerPullRequestsQuery} from '../../types/gql-types';
import {GitHub} from '../../utils/github';
import {getLoginFromRequest} from '../utils/login-from-request';

export class DashData {
  private github: GitHub;

  constructor(github: GitHub) {
    this.github = github;
  }

  getHandler() {
    return this.handler.bind(this);
  }

  private async handler(req: express.Request, res: express.Response) {
    const loginDetails = await getLoginFromRequest(this.github, req);
    if (!loginDetails) {
      res.send(401);
      return;
    }

    const userData = await this.fetchUserData(
        req.query.login || loginDetails.username, loginDetails.token);
    res.header('content-type', 'application/json');
    res.send(JSON.stringify(userData, null, 2));
  }

  async fetchUserData(login: string, token: string): Promise<api.DashResponse> {
    const openPrQuery = 'is:open is:pr archived:false';

    const viewerPrsResult = await this.github.query<ViewerPullRequestsQuery>({
      query: prsQuery,
      variables: {
        login,
        reviewRequestsQueryString: `review-requested:${login} ${openPrQuery}`,
        reviewedQueryString:
            `reviewed-by:${login} ${openPrQuery} -author:${login}`,
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

        const outgoingPr: api.OutgoingPullRequest = {
          ...convertPrFields(pr),
          reviews: [],
          reviewRequests: [],
          status: {type: 'WaitingReview', reviewers: []},
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
          // Filter out reviews from the viewer.
          const prReviews = pr.reviews.nodes.filter(
              (review) =>
                  review && review.author && review.author.login !== login);
          reviewsForOutgoingPrs(prReviews, outgoingPr);
        }

        const reviewersCount =
            outgoingPr.reviewRequests.length + outgoingPr.reviews.length;
        if (outgoingPr.status.type === 'WaitingReview' &&
            reviewersCount === 0) {
          outgoingPr.status = {type: 'NoReviewers'};
        } else if (outgoingPr.status.type === 'WaitingReview') {
          outgoingPr.status.reviewers = Array.from(new Set([
            ...outgoingPr.reviewRequests,
            ...outgoingPr.reviews.map((review) => review.author),
          ]));
        }

        outgoingPrs.push(outgoingPr);
      }

      // Incoming reviews
      for (const pr of viewerPrsResult.data.reviewRequests.nodes || []) {
        if (!pr || pr.__typename !== 'PullRequest') {
          continue;
        }

        const incomingPr: api.IncomingPullRequest = {
          ...convertPrFields(pr),
          myReview: null,
          status: {type: 'ReviewRequired'},
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
          // Generated gql-types is missing the proper __type field so a cast is
          // needed.
          relevantReview = findMyRelevantReview(
              pr.reviews.nodes as Array<reviewFieldsFragment|null>);
        }

        let myReview = null;
        let status: api.PullRequestStatus = {type: 'NoActionRequired'};
        if (relevantReview) {
          // Cast because inner type has less strict type for __typename.
          myReview =
              convertReviewFields(relevantReview as reviewFieldsFragment);

          if (relevantReview.state !== PullRequestReviewState.APPROVED) {
            status = {type: 'ApprovalRequired'};
          }
        }

        const reviewedPr: api.IncomingPullRequest = {
          ...convertPrFields(pr),
          myReview,
          status,
        };

        if (myReview) {
          reviewedPr.events.push({type: 'MyReviewEvent', review: myReview});
        }

        incomingPrs.push(reviewedPr);
      }
    }
    return {
      // Sort newest first.
      outgoingPrs: outgoingPrs.sort((a, b) => b.createdAt - a.createdAt),
      incomingPrs,
    };
  }
}

function reviewsForOutgoingPrs(
    reviews: Array<reviewFieldsFragment|null>,
    outgoingPr: api.OutgoingPullRequest) {
  for (const review of reviews) {
    if (!review) {
      continue;
    }

    if (outgoingPr.status.type === 'WaitingReview' &&
        review.state === PullRequestReviewState.APPROVED) {
      outgoingPr.status = {type: 'PendingMerge'};
    } else if (review.state === PullRequestReviewState.CHANGES_REQUESTED) {
      outgoingPr.status = {type: 'PendingChanges'};
    }

    outgoingPr.reviews.push(convertReviewFields(review));
  }

  const reviewsRequestingChanges = outgoingPr.reviews.filter(
      (review) =>
          review.reviewState === PullRequestReviewState.CHANGES_REQUESTED);
  const reviewsApproved = outgoingPr.reviews.filter(
      (review) => review.reviewState === PullRequestReviewState.APPROVED);
  let eventReviews = null;

  if (reviewsRequestingChanges.length) {
    eventReviews = reviewsRequestingChanges;
  } else if (reviewsApproved.length) {
    eventReviews = reviewsApproved;
  } else if (outgoingPr.reviews.length) {
    eventReviews = outgoingPr.reviews;
  }

  if (eventReviews) {
    outgoingPr.events.push({
      type: 'OutgoingReviewEvent',
      reviews: eventReviews,
    });
  }
}

function findMyRelevantReview(reviews: Array<reviewFieldsFragment|null>):
    reviewFieldsFragment|null {
  let relevantReview: reviewFieldsFragment|null = null;
  for (let i = reviews.length - 1; i >= 0; i--) {
    const nextReview = reviews[i];
    // Pending reviews have not been sent yet.
    if (!relevantReview && nextReview &&
        nextReview.state !== PullRequestReviewState.PENDING) {
      relevantReview = nextReview;
    } else if (
        relevantReview &&
        relevantReview.state === PullRequestReviewState.COMMENTED &&
        nextReview &&
        (nextReview.state === PullRequestReviewState.APPROVED ||
         nextReview.state === PullRequestReviewState.CHANGES_REQUESTED)) {
      // Use last approved/changes requested if it exists.
      relevantReview = nextReview;
    }
  }
  return relevantReview;
}

/**
 * Converts a pull request GraphQL object to an API object.
 */
function convertPrFields(fields: prFieldsFragment): api.PullRequest {
  const pr: api.PullRequest = {
    repository: fields.repository.nameWithOwner,
    title: fields.title,
    createdAt: Date.parse(fields.createdAt),
    url: fields.url,
    avatarUrl: '',
    author: '',
    status: {type: 'UnknownStatus'},
    events: [],
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
function convertReviewFields(fields: reviewFieldsFragment): api.Review {
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
