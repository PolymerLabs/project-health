import * as express from 'express';

import * as api from '../../../types/api';
import {OutgoingPullRequestInfo} from '../../../types/api';
import {commitFieldsFragment, OutgoingPullRequestsQuery, PullRequestReviewState, reviewFieldsFragment} from '../../../types/gql-types';
import {github} from '../../../utils/github';
import {githubAppModel} from '../../models/githubAppModel';
import {pullRequestsModel} from '../../models/pullRequestsModel';
import {repositoryModel} from '../../models/repositoryModel';
import {userModel, UserRecord} from '../../models/userModel';
import {getPRLastActivity} from '../../utils/get-pr-last-activity';
import {issueHasNewActivity} from '../../utils/issue-has-new-activity';
import {DataAPIResponse} from '../api-router/abstract-api-router';
import * as responseHelper from '../api-router/response-helper';
import {convertPrFields, convertReviewFields, outgoingPrsQuery} from '../dash-data';

/**
 * Fetches outgoing pull requests for user.
 */
export async function handleOutgoingPRRequest(
    request: express.Request, userRecord: UserRecord):
    Promise<DataAPIResponse<api.OutgoingDashResponse>> {
  const dashLogin = request.query.login || userRecord.username;
  const startCursor = request.query.cursor;
  const outgoingPrData =
      await performQuery(dashLogin, userRecord.githubToken, startCursor);
  const prInfo = await getAllPRInfo(userRecord, dashLogin, outgoingPrData);

  return responseHelper.data({
    timestamp: new Date().toISOString(),
    user: getDashboardUser(userRecord, dashLogin, outgoingPrData),
    ...prInfo,
  });
}

async function performQuery(login: string, token: string, startCursor?: string):
    Promise<OutgoingPullRequestsQuery> {
  const openPrQuery = 'is:open is:pr archived:false';
  const reviewedQueryString =
      `reviewed-by:${login} ${openPrQuery} -author:${login}`;
  const reviewRequestsQueryString = `review-requested:${login} ${openPrQuery}`;
  const mentionsQueryString = `${reviewedQueryString} mentions:${login}`;

  const viewerPrsResult = await github().query<OutgoingPullRequestsQuery>({
    query: outgoingPrsQuery,
    variables: {
      login,
      reviewRequestsQueryString,
      reviewedQueryString,
      mentionsQueryString,
      startCursor,
    },
    fetchPolicy: 'network-only',
    context: {token}
  });
  return viewerPrsResult.data;
}

function getDashboardUser(
    userRecord: UserRecord,
    dashLogin: string,
    data: OutgoingPullRequestsQuery) {
  const user: api.DashboardUser = {
    login: dashLogin,
    isCurrentUser: userRecord.username === dashLogin,
    name: null,
    avatarUrl: null,
  };

  if (data.user) {
    user.name = data.user.name;
    user.avatarUrl = data.user.avatarUrl;
  }

  return user;
}

async function getAllPRInfo(
    userRecord: UserRecord, dashLogin: string, data: OutgoingPullRequestsQuery):
    Promise<OutgoingPullRequestInfo> {
  let totalCount = 0;
  let hasMore = false;
  let cursor = null;
  const prs: api.OutgoingPullRequest[] = [];

  if (data.user) {
    let loginRecord: UserRecord|null = null;
    let lastViewedInfo: {[issue: string]: number}|null = null;
    if (dashLogin === userRecord.username) {
      loginRecord = await userModel.getUserRecord(dashLogin);
      lastViewedInfo = await userModel.getAllLastViewedInfo(dashLogin);
    }

    const prConnection = data.user.pullRequests;

    // Set pagination info.
    totalCount = prConnection.totalCount;
    hasMore = prConnection.pageInfo.hasPreviousPage;
    cursor = prConnection.pageInfo.startCursor;

    const requestPrs = prConnection.nodes || [];
    const prPromises = requestPrs.map(async (pr) => {
      if (!pr) {
        return null;
      }

      if (pr.viewerSubscription === 'IGNORED') {
        return null;
      }

      const outgoingPr: api.PullRequest = convertPrFields(pr);

      // Get the requested reviews
      const reviewRequests: string[] = [];
      if (pr.reviewRequests && pr.reviewRequests.nodes) {
        pr.reviewRequests.nodes.forEach((node) => {
          if (node === null) {
            return;
          }
          if (!node.requestedReviewer) {
            return;
          }
          if (node.requestedReviewer.__typename !== 'User') {
            return;
          }

          reviewRequests.push(node.requestedReviewer.login);
        });
      }

      // Get PR Reviews
      const rawReviews: reviewFieldsFragment[] = [];
      if (pr.reviews && pr.reviews.nodes) {
        // Filter out reviews from the viewer.
        pr.reviews.nodes.forEach((review) => {
          if (!review || !review.author) {
            return;
          }
          if (review.author.login !== dashLogin) {
            rawReviews.push(review);
          }
        });
      }
      const reviews = reviewsForOutgoingPrs(rawReviews);

      // Prepare review events
      const reviewsRequestingChanges = reviews.filter(
          (review) =>
              review.reviewState === PullRequestReviewState.CHANGES_REQUESTED);
      const reviewsApproved = reviews.filter(
          (review) => review.reviewState === PullRequestReviewState.APPROVED);

      let reviewEvents = null;
      if (reviewsRequestingChanges.length) {
        reviewEvents = reviewsRequestingChanges;
      } else if (reviewsApproved.length) {
        reviewEvents = reviewsApproved;
      } else if (reviews.length) {
        reviewEvents = reviews;
      }

      if (reviewEvents) {
        outgoingPr.events.push({
          type: 'OutgoingReviewEvent',
          reviews: reviewEvents,
        });
      }

      const commits: commitFieldsFragment[] = [];
      if (pr.commits && pr.commits.nodes) {
        for (const commitNode of pr.commits.nodes) {
          if (commitNode && commitNode.commit) {
            commits.push(commitNode.commit);
          }
        }
      }
      if (commits.length > 1) {
        throw new Error(
            'Commits are expected to contain *only* the latest ' +
            'commit. This isn\'t the case and needs to be fixed.');
      }

      let latestCommit: commitFieldsFragment|null = null;
      if (commits.length > 0) {
        latestCommit = commits[0];
      }

      // Get status
      const outgoingStatus: api.PullRequestStatus =
          getStatus(reviewRequests, reviews, latestCommit);
      outgoingPr.status = outgoingStatus;

      // Get repo details and automerge info
      const results = await Promise.all([
        repositoryModel.getRepositoryDetails(
            userRecord,
            pr.repository.owner.login,
            pr.repository.name,
            ),
        pullRequestsModel.getPRData(
            pr.repository.owner.login, pr.repository.name, pr.number),
      ]);

      const repoDetails = results[0];
      const prDetails = results[1];

      const automergeAvailable = await githubAppModel.isAppInstalledOnRepo(
          pr.repository.owner.login, pr.repository.name);
      let automergeSelection = null;
      if (prDetails && prDetails.automerge) {
        automergeSelection = prDetails.automerge;
      }

      const fullPR: api.OutgoingPullRequest = {
        ...outgoingPr,
        repoDetails,
        automergeAvailable,
        automergeSelection,
        mergeable: pr.mergeable,
        hasNewActivity: false,
      };

      if (lastViewedInfo && loginRecord) {
        const lastActivity =
            await getPRLastActivity(userRecord.username, fullPR);
        if (lastActivity) {
          fullPR.hasNewActivity = await issueHasNewActivity(
              loginRecord, lastActivity, lastViewedInfo[pr.id]);
        }
      }

      return fullPR;
    });

    const prResults = await Promise.all(prPromises);
    prResults.forEach((pr) => {
      if (pr === null) {
        return;
      }
      prs.push(pr);
    });
  }

  prs.sort((a, b) => b.createdAt - a.createdAt);

  return {
    totalCount,
    hasMore,
    cursor,
    prs,
  };
}

function reviewsForOutgoingPrs(reviews: reviewFieldsFragment[]): api.Review[] {
  // Get the latest important review for each reviewer.
  const reviewerMap: Map<string, reviewFieldsFragment> = new Map();
  for (const review of reviews) {
    if (!review || !review.author || !review.submittedAt) {
      continue;
    }

    if (!reviewerMap.has(review.author.login)) {
      reviewerMap.set(review.author.login, review);
      continue;
    }

    const selectedReview = reviewerMap.get(review.author.login)!;
    const importantReviews = [
      PullRequestReviewState.APPROVED,
      PullRequestReviewState.CHANGES_REQUESTED
    ];

    // If the existing review is important and the incoming one isn't, ignore.
    if (importantReviews.includes(selectedReview.state) &&
        !importantReviews.includes(review.state)) {
      continue;
    }

    // Store if its newer.
    if (review.submittedAt > selectedReview.submittedAt!) {
      reviewerMap.set(review.author.login, review);
    }
  }

  // Convert reviews.
  const parsedReviews: api.Review[] = [];
  for (const review of reviewerMap.values()) {
    parsedReviews.push(convertReviewFields(review));
  }
  return parsedReviews;
}

function getStatus(
    reviewRequests: string[],
    reviews: api.Review[],
    latestCommit: commitFieldsFragment|null): api.PullRequestStatus {
  let outgoingStatus: api.PullRequestStatus = {
    type: 'UnknownStatus',
  };

  const reviewersCount = reviewRequests.length + reviews.length;
  if (reviewersCount === 0) {
    outgoingStatus = {
      type: 'NoReviewers',
    };
  } else {
    const reviewsRequestingChanges = reviews.filter(
        (review) =>
            review.reviewState === PullRequestReviewState.CHANGES_REQUESTED);
    const reviewsApproved = reviews.filter(
        (review) => review.reviewState === PullRequestReviewState.APPROVED);

    if (reviewsRequestingChanges.length > 0) {
      let requiresChanges = false;
      if (latestCommit && latestCommit.pushedDate) {
        for (const review of reviewsRequestingChanges) {
          if (review.createdAt > Date.parse(latestCommit.pushedDate)) {
            requiresChanges = true;
          }
        }
      }
      if (requiresChanges) {
        outgoingStatus = {type: 'PendingChanges'};
      }
    } else if (reviewsApproved.length) {
      if (latestCommit && latestCommit.status) {
        const state = latestCommit.status.state;
        if (state === 'PENDING') {
          outgoingStatus = {type: 'StatusChecksPending'};
        } else if (state === 'ERROR' || state === 'FAILURE') {
          outgoingStatus = {type: 'StatusChecksFailed'};
        } else if (state === 'SUCCESS') {
          outgoingStatus = {type: 'PendingMerge'};
        }
      } else {
        // No status so treat as pending merge
        outgoingStatus = {type: 'PendingMerge'};
      }
    }

    if (outgoingStatus.type === 'UnknownStatus') {
      outgoingStatus = {
        type: 'WaitingReview',
        reviewers: Array.from(new Set([
          ...reviewRequests,
          ...reviews.map((review) => review.author),
        ])),
      };
    }
  }

  return outgoingStatus;
}
