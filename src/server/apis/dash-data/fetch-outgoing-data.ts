import * as api from '../../../types/api';
import {OutgoingPullRequestInfo} from '../../../types/api';
import {OutgoingPullRequestsQuery, PullRequestReviewState, reviewFieldsFragment} from '../../../types/gql-types';
import {github} from '../../../utils/github';
import {pullRequestsModel} from '../../models/pullRequestsModel';
import {repositoryModel} from '../../models/repositoryModel';
import {LoginDetails} from '../../models/userModel';
import {convertPrFields, convertReviewFields, outgoingPrsQuery} from '../dash-data';

/**
 * Fetches outgoing pull requests for user.
 */
export async function fetchOutgoingData(
    loginDetails: LoginDetails, dashLogin: string, startCursor?: string):
    Promise<api.OutgoingDashResponse> {
  const outgoingPrData =
      await performQuery(dashLogin, loginDetails.githubToken, startCursor);

  const prInfo = await getAllPRInfo(loginDetails, dashLogin, outgoingPrData);

  return {
    timestamp: new Date().toISOString(),
    user: getDashboardUser(loginDetails, dashLogin, outgoingPrData),
    ...prInfo,
  };
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
      startCursor
    },
    fetchPolicy: 'network-only',
    context: {token}
  });

  return viewerPrsResult.data;
}

function getDashboardUser(
    loginDetails: LoginDetails,
    dashLogin: string,
    data: OutgoingPullRequestsQuery) {
  const user: api.DashboardUser = {
    login: dashLogin,
    isCurrentUser: loginDetails.username === dashLogin,
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
    loginDetails: LoginDetails,
    dashLogin: string,
    data: OutgoingPullRequestsQuery): Promise<OutgoingPullRequestInfo> {
  let totalCount = 0;
  let hasMore = false;
  let cursor = null;
  const prs: api.OutgoingPullRequest[] = [];

  if (data.user) {
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

      // Get status
      const outgoingStatus: api.PullRequestStatus =
          getStatus(reviewRequests, reviews);
      outgoingPr.status = outgoingStatus;

      // Get repo details and automerge info
      const results = await Promise.all([
        repositoryModel.getRepositoryDetails(
            loginDetails,
            pr.repository.owner.login,
            pr.repository.name,
            ),
        pullRequestsModel.getAutomergeOpts(pr.id),
      ]);

      const repoDetails = results[0];
      const automergeOpts = results[1];

      const fullPR: api.OutgoingPullRequest = {
        ...outgoingPr,
        repoDetails,
        automergeOpts,
        mergeable: pr.mergeable,
      };

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
    if (!review || !review.author) {
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
    if (review.createdAt > selectedReview.createdAt) {
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
    reviewRequests: string[], reviews: api.Review[]): api.PullRequestStatus {
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
      outgoingStatus = {type: 'PendingChanges'};
    } else if (reviewsApproved.length === reviewersCount) {
      outgoingStatus = {type: 'PendingMerge'};
    } else {
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
