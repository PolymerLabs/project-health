import * as express from 'express';
import gql from 'graphql-tag';

import * as api from '../../types/api';
import {IncomingPullRequestsQuery, mentionedFieldsFragment, prFieldsFragment, PullRequestReviewState, reviewFieldsFragment} from '../../types/gql-types';
import {github} from '../../utils/github';
import {userModel} from '../models/userModel';
import {fetchOutgoingData} from './dash-data/fetch-outgoing-data';

/**
 * Router for the dash component.
 */
export function getRouter(): express.Router {
  const router = express.Router();
  router.get('/outgoing', outgoingHandler);
  router.get('/incoming', incomingHandler);
  return router;
}

/**
 * Handles a response for outgoing pull requests. Available options:
 *  - ?login - string of username to view as
 *  - ?cursor - page cursor
 */
async function outgoingHandler(req: express.Request, res: express.Response) {
  const loginDetails = await userModel.getLoginFromRequest(req);
  if (!loginDetails) {
    res.sendStatus(401);
    return;
  }

  const userData = await fetchOutgoingData(
      loginDetails,
      req.query.login || loginDetails.username,
      req.query.cursor,
  );

  res.json(userData);
}

/**
 * Handles a response for incoming pull requests.
 */
async function incomingHandler(req: express.Request, res: express.Response) {
  const loginDetails = await userModel.getLoginFromRequest(req);
  if (!loginDetails) {
    res.sendStatus(401);
    return;
  }

  const userData = await fetchIncomingData(
      req.query.login || loginDetails.username,
      loginDetails.githubToken,
  );

  res.json(userData);
}

/**
 * Fetches incoming pull requests for user.
 */
export async function fetchIncomingData(
    dashboardLogin: string, token: string): Promise<api.IncomingDashResponse> {
  const openPrQuery = 'is:open is:pr archived:false';
  const reviewedQueryString =
      `reviewed-by:${dashboardLogin} ${openPrQuery} -author:${dashboardLogin}`;
  const reviewRequestsQueryString =
      `review-requested:${dashboardLogin} ${openPrQuery}`;
  const mentionsQueryString =
      `${reviewedQueryString} mentions:${dashboardLogin}`;

  const viewerPrsResult = await github().query<IncomingPullRequestsQuery>({
    query: incomingPrsQuery,
    variables: {
      login: dashboardLogin,
      reviewRequestsQueryString,
      reviewedQueryString,
      mentionsQueryString,
    },
    fetchPolicy: 'network-only',
    context: {token}
  });

  const incomingPrs = [];
  // In some cases, GitHub will return a PR both in the review request list
  // and the reviewed list. This ID set is used to ensure we don't show a PR
  // twice.
  const prsShown = [];

  // Build a list of mentions.
  const mentioned: Map<string, api.MentionedEvent> = new Map();
  for (const item of viewerPrsResult.data.mentions.nodes || []) {
    if (!item || item.__typename !== 'PullRequest') {
      continue;
    }
    const mention = getLastMentioned(item, dashboardLogin);
    if (mention) {
      mentioned.set(item.id, mention);
    }
  }

  // Incoming PRs that I've reviewed.
  for (const pr of viewerPrsResult.data.reviewed.nodes || []) {
    if (!pr || pr.__typename !== 'PullRequest') {
      continue;
    }

    if (pr.viewerSubscription === 'IGNORED') {
      continue;
    }

    // Find relevant review.
    let relevantReview: MyReviewFields|null = null;
    if (pr.reviews && pr.reviews.nodes) {
      // Generated gql-types is missing the proper __type field so a cast is
      // needed.
      relevantReview =
          findMyRelevantReview(pr.reviews.nodes as Array<MyReviewFields|null>);
    }

    let myReview: api.Review|null = null;
    if (relevantReview) {
      // Cast because inner type has less strict type for __typename.
      myReview = convertReviewFields(relevantReview as reviewFieldsFragment);
    }

    const reviewedPr: api.PullRequest = {
      ...convertPrFields(pr),
      status: {type: 'NoActionRequired'},
    };

    const prMention = mentioned.get(pr.id);
    if (myReview) {
      reviewedPr.events.push({type: 'MyReviewEvent', review: myReview});

      if (prMention && prMention.mentionedAt > myReview.createdAt) {
        reviewedPr.events.push(prMention);
      }
    } else if (prMention) {
      reviewedPr.events.push(prMention);
    }

    // Check if there are new commits to the pull request.
    let hasNewCommits = false;
    if (pr.commits.nodes) {
      const newCommits = [];
      let additions = 0;
      let deletions = 0;
      let changedFiles = 0;
      let lastPushedAt = 0;
      let lastOid;
      for (const node of pr.commits.nodes) {
        if (!myReview || !node || !node.commit.pushedDate) {
          continue;
        }
        const pushedAt = Date.parse(node.commit.pushedDate);
        if (pushedAt <= myReview.createdAt) {
          continue;
        }
        additions += node.commit.additions;
        deletions += node.commit.deletions;
        changedFiles += node.commit.changedFiles;
        if (pushedAt > lastPushedAt) {
          lastPushedAt = Date.parse(node.commit.pushedDate);
          lastOid = node.commit.oid;
        }
        newCommits.push(node);
      }

      if (newCommits.length && relevantReview) {
        // Commit can be null.
        const url = relevantReview.commit ?
            `${pr.url}/files/${relevantReview.commit.oid}..${lastOid || ''}` :
            '';
        reviewedPr.events.push({
          type: 'NewCommitsEvent',
          count: newCommits.length,
          additions,
          deletions,
          changedFiles,
          lastPushedAt,
          url,
        });
        hasNewCommits = true;
      }

      reviewedPr.events = sortEvents(reviewedPr.events);
    }

    if (relevantReview &&
        relevantReview.state === PullRequestReviewState.CHANGES_REQUESTED &&
        !hasNewCommits) {
      reviewedPr.status = {type: 'ChangesRequested'};
    } else if (
        relevantReview &&
        relevantReview.state !== PullRequestReviewState.APPROVED) {
      reviewedPr.status = {type: 'ApprovalRequired'};
    }

    prsShown.push(pr.id);
    incomingPrs.push(reviewedPr);
  }

  // Incoming review requests.
  for (const pr of viewerPrsResult.data.reviewRequests.nodes || []) {
    if (!pr || pr.__typename !== 'PullRequest' || prsShown.includes(pr.id)) {
      continue;
    }

    if (pr.viewerSubscription === 'IGNORED') {
      continue;
    }

    const incomingPr: api.PullRequest = {
      ...convertPrFields(pr),
      status: {type: 'ReviewRequired'},
    };

    incomingPrs.push(incomingPr);
  }
  return {
    timestamp: new Date().toISOString(),
    // Sort newest first.
    prs: sortIncomingPRs(incomingPrs),
  };
}

/**
 * Ensures events are ordered correctly.
 */
function sortEvents(events: api.PullRequestEvent[]): api.PullRequestEvent[] {
  const eventTime = (event: api.PullRequestEvent) => {
    if (event.type === 'MentionedEvent') {
      return event.mentionedAt;
    } else if (event.type === 'NewCommitsEvent') {
      return event.lastPushedAt;
    } else if (event.type === 'MyReviewEvent') {
      return event.review.createdAt;
    } else {
      return 0;
    }
  };
  const compareEvents =
      (a: api.PullRequestEvent, b: api.PullRequestEvent): number => {
        const aTime = eventTime(a);
        const bTime = eventTime(b);
        if (aTime === 0 || bTime === 0) {
          return 0;
        }
        return aTime - bTime;
      };
  return events.sort(compareEvents);
}

/**
 * Sorts incoming PRs into how they should be displayed.
 */
function sortIncomingPRs(prs: api.PullRequest[]): api.PullRequest[] {
  function getLatestEventTime(pr: api.PullRequest): number {
    let latest = pr.createdAt;
    for (const event of pr.events) {
      switch (event.type) {
        case 'NewCommitsEvent':
          if (event.lastPushedAt > latest) {
            latest = event.lastPushedAt;
          }
          break;
        case 'MentionedEvent':
          if (event.mentionedAt > latest) {
            latest = event.mentionedAt;
          }
          break;
        case 'MyReviewEvent':
          // Ignore my review events. Shouldn't impact ordering since it's an
          // event generated by you.
          break;
        default:
          break;
      }
    }
    return latest;
  }

  // Sort descending by latest event time.
  const timeSorted =
      prs.sort((a, b) => getLatestEventTime(b) - getLatestEventTime(a));

  const notActionableStatuses = [
    'UnknownStatus',
    'ChangesRequested',
    'NoActionRequired',
    'NewActivity',
    'StatusChecksPending'
  ];
  const actionable = [];
  const notActionable = [];
  // Add actionable PRs.
  for (const pr of timeSorted) {
    if (notActionableStatuses.includes(pr.status.type)) {
      notActionable.push(pr);
    } else {
      actionable.push(pr);
    }
  }
  return actionable.concat(notActionable);
}



type MyReviewFields = reviewFieldsFragment&{commit: {oid: string}};

function findMyRelevantReview(reviews: Array<MyReviewFields|null>):
    MyReviewFields|null {
  let relevantReview: MyReviewFields|null = null;
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
export function convertPrFields(fields: prFieldsFragment): api.PullRequest {
  const pr: api.PullRequest = {
    id: fields.id,
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
export function convertReviewFields(fields: reviewFieldsFragment): api.Review {
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

function getLastMentioned(pullRequest: mentionedFieldsFragment, login: string):
    api.MentionedEvent|null {
  let latest = null;

  for (const comment of pullRequest.comments.nodes || []) {
    if (!comment || !comment.bodyText.includes(`@${login}`)) {
      continue;
    }
    if (!latest || comment.createdAt > latest.createdAt) {
      latest = comment;
    }
  }

  if (pullRequest.reviews) {
    for (const review of pullRequest.reviews.nodes || []) {
      if (!review) {
        continue;
      }
      if (review.bodyText.includes(`@${login}`) &&
          (!latest || review.createdAt > latest.createdAt)) {
        latest = review;
      }

      for (const comment of review.comments.nodes || []) {
        if (!comment || !comment.bodyText.includes(`@${login}`)) {
          continue;
        }
        if (!latest || comment.createdAt > latest.createdAt) {
          latest = comment;
        }
      }
    }
  }

  if (!latest) {
    return null;
  }

  let text = latest.bodyText;
  if (text.length > 300) {
    text = text.substr(0, 300) + '…';
  }

  return {
    type: 'MentionedEvent',
    text,
    mentionedAt: Date.parse(latest.createdAt),
    url: latest.url,
  };
}

const reviewFragment = gql`
fragment reviewFields on PullRequestReview {
  createdAt
  state
  author {
    login
  }
}`;

const prFragment = gql`
fragment prFields on PullRequest {
  repository {
    name
    nameWithOwner
    owner {
      login
    }
  }
  title
  url
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

const incomingPrsQuery = gql`
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
