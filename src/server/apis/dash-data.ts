import * as express from 'express';
import gql from 'graphql-tag';

import * as api from '../../types/api';
import {prFieldsFragment, reviewFieldsFragment} from '../../types/gql-types';
import {PrivateAPIRouter} from './api-router/private-api-router';
import {handleIncomingPRRequest} from './dash-data/handle-incoming-pr-request';
import {handleOutgoingPRRequest} from './dash-data/handle-outgoing-pr-request';

/**
 * Router for the dash component.
 */
export function getRouter(): express.Router {
  const dashRouter = new PrivateAPIRouter();
  dashRouter.get('/outgoing', handleOutgoingPRRequest);
  dashRouter.get('/incoming', handleIncomingPRRequest);
  return dashRouter.router;
}

/**
 * Converts a review GraphQL object to an API object.
 */
export function convertReviewFields(fields: reviewFieldsFragment): api.Review {
  const review = {
    author: '',
    createdAt: fields.submittedAt ? Date.parse(fields.submittedAt) : -1,
    reviewState: fields.state,
  };

  if (fields.author && fields.author.__typename === 'User') {
    review.author = fields.author.login;
  }

  return review;
}

/**
 * Converts a pull request GraphQL object to an API object.
 */
export function convertPrFields(fields: prFieldsFragment): api.PullRequest {
  const pr: api.PullRequest = {
    id: fields.id,
    owner: fields.repository.owner.login,
    repo: fields.repository.name,
    number: fields.number,
    title: fields.title,
    createdAt: Date.parse(fields.createdAt),
    url: fields.url,
    avatarUrl: '',
    author: '',
    status: {type: 'UnknownStatus'},
    events: [],
    hasNewActivity: false,
  };

  if (fields.author) {
    pr.author = fields.author.login;
    pr.avatarUrl = fields.author.avatarUrl;
  }

  return pr;
}

const reviewFragment = gql`
fragment reviewFields on PullRequestReview {
  submittedAt
  state
  author {
    login
  }
}`;

const prFragment = gql`
fragment prFields on PullRequest {
  repository {
    id
    name
    nameWithOwner
    owner {
      login
    }
  }
  title
  url
  number
  id
  mergeable
  createdAt
  viewerSubscription
  author {
    avatarUrl
    login
    url
  }
}`;

const lastCommentFragment = gql`
fragment lastCommentFields on PullRequest {
  comments(last: 1) {
    nodes {
      author {
        login
      }
      createdAt
    }
  }
}`;

export const outgoingPrsQuery = gql`
query OutgoingPullRequests($login: String!, $startCursor: String) {
	user(login: $login) {
    name
    avatarUrl
    login
    pullRequests(last: 10, states: [OPEN], before: $startCursor) {
      totalCount
      pageInfo {
        hasPreviousPage
        startCursor
      }
      nodes {
        ...prFields
        ...statusFields
        ...lastCommentFields
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
  rateLimit {
    cost
    limit
    remaining
    resetAt
    nodeCount
  }
}

${prFragment}
${reviewFragment}
${lastCommentFragment}

fragment commitFields on Commit {
  status {
    contexts {
      id
      context
      state
      createdAt
    }
    state
  }
  pushedDate
}

fragment statusFields on PullRequest {
	commits(last: 1) {
    nodes {
      commit {
        ...commitFields
      }
    }
  }
}
`;

export const incomingPrsQuery = gql`
query IncomingPullRequests($login: String!, $reviewRequestsQueryString: String!, $reviewedQueryString: String!, $mentionsQueryString: String!) {
  reviewRequests: search(type: ISSUE, query: $reviewRequestsQueryString, last: 20) {
    nodes {
      ... on PullRequest {
        ...prFields
      }
    }
  }
  reviewed: search(type: ISSUE, query: $reviewedQueryString, last: 20) {
    nodes {
      ... on PullRequest {
        ...prFields
        ...lastCommentFields
        reviews(author: $login, last: 10) {
          nodes {
            ...reviewFields
            commit {
              oid
            }
          }
        }
        commits(last: 20) {
          nodes {
            commit {
              additions
              deletions
              changedFiles
              authoredDate
              pushedDate
              oid
            }
          }
        }
      }
    }
  }
  mentions: search(type: ISSUE, query: $mentionsQueryString, last: 20) {
    nodes {
      ...mentionedFields
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

${prFragment}
${reviewFragment}
${lastCommentFragment}

fragment mentionedFields on PullRequest {
  id
  comments(last: 10) {
    nodes {
      createdAt
      bodyText
      url
    }
  }
  reviews(last: 10) {
    nodes {
      bodyText
      createdAt
      url
      comments(last: 10) {
        nodes {
          createdAt
          bodyText
          url
        }
      }
    }
  }
}`;
