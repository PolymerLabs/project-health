import * as express from 'express';
import gql from 'graphql-tag';

import * as api from '../../types/api';
import {mentionedFieldsFragment, prFieldsFragment, PullRequestReviewState, reviewFieldsFragment, ViewerPullRequestsQuery} from '../../types/gql-types';
import {github} from '../../utils/github';
import {userModel} from '../models/userModel';

export class DashData {
  getHandler() {
    return this.handler.bind(this);
  }

  private async handler(req: express.Request, res: express.Response) {
    const loginDetails = await userModel.getLoginFromRequest(req);
    if (!loginDetails) {
      res.sendStatus(401);
      return;
    }

    const userData = await this.fetchUserData(
        req.query.login || loginDetails.username, loginDetails.token);
    res.header('content-type', 'application/json');
    res.send(JSON.stringify(userData, null, 2));
  }

  async fetchUserData(login: string, token: string): Promise<api.DashResponse> {
    const openPrQuery = 'is:open is:pr archived:false';
    const reviewedQueryString =
        `reviewed-by:${login} ${openPrQuery} -author:${login}`;
    const reviewRequestsQueryString =
        `review-requested:${login} ${openPrQuery}`;
    const mentionsQueryString = `${reviewedQueryString} mentions:${login}`;

    const viewerPrsResult = await github().query<ViewerPullRequestsQuery>({
      query: prsQuery,
      variables: {
        login,
        reviewRequestsQueryString,
        reviewedQueryString,
        mentionsQueryString,
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

        const outgoingPr: api.PullRequest = {
          ...convertPrFields(pr),
          status: {type: 'WaitingReview', reviewers: []},
        };

        if (pr.author && pr.author.__typename === 'User') {
          outgoingPr.author = pr.author.login;
          outgoingPr.avatarUrl = pr.author.avatarUrl;
        }

        const reviewRequests = [];
        if (pr.reviewRequests) {
          for (const request of pr.reviewRequests.nodes || []) {
            if (!request || !request.requestedReviewer ||
                request.requestedReviewer.__typename !== 'User') {
              continue;
            }
            reviewRequests.push(request.requestedReviewer.login);
          }
        }

        let reviews: api.Review[] = [];
        if (pr.reviews && pr.reviews.nodes) {
          // Filter out reviews from the viewer.
          const prReviews = pr.reviews.nodes.filter(
              (review) =>
                  review && review.author && review.author.login !== login);
          reviews = reviewsForOutgoingPrs(prReviews, outgoingPr);
        }

        const reviewersCount = reviewRequests.length + reviews.length;
        if (outgoingPr.status.type === 'WaitingReview' &&
            reviewersCount === 0) {
          outgoingPr.status = {type: 'NoReviewers'};
        } else if (outgoingPr.status.type === 'WaitingReview') {
          outgoingPr.status.reviewers = Array.from(new Set([
            ...reviewRequests,
            ...reviews.map((review) => review.author),
          ]));
        }

        outgoingPrs.push(outgoingPr);
      }

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
        const mention = getLastMentioned(item, login);
        if (mention) {
          mentioned.set(item.id, mention);
        }
      }

      // Incoming PRs that I've reviewed.
      for (const pr of viewerPrsResult.data.reviewed.nodes || []) {
        if (!pr || pr.__typename !== 'PullRequest') {
          continue;
        }

        // Find relevant review.
        let relevantReview: MyReviewFields|null = null;
        if (pr.reviews && pr.reviews.nodes) {
          // Generated gql-types is missing the proper __type field so a cast is
          // needed.
          relevantReview = findMyRelevantReview(
              pr.reviews.nodes as Array<MyReviewFields|null>);
        }

        let myReview: api.Review|null = null;
        let status: api.PullRequestStatus = {type: 'NoActionRequired'};
        if (relevantReview) {
          // Cast because inner type has less strict type for __typename.
          myReview =
              convertReviewFields(relevantReview as reviewFieldsFragment);

          if (relevantReview.state !== PullRequestReviewState.APPROVED) {
            status = {type: 'ApprovalRequired'};
          }
        }

        const reviewedPr: api.PullRequest = {
          ...convertPrFields(pr),
          status,
        };

        if (myReview) {
          reviewedPr.events.push({type: 'MyReviewEvent', review: myReview});

          // TODO: this could be in the wrong order with the new commits below.
          const prMention = mentioned.get(pr.id);
          if (prMention && prMention.mentionedAt > myReview.createdAt) {
            reviewedPr.events.push(prMention);
          }
        }

        // Check if there are new commits to the pull request.
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
            reviewedPr.events.push({
              type: 'NewCommitsEvent',
              count: newCommits.length,
              additions,
              deletions,
              changedFiles,
              lastPushedAt,
              url: `${pr.url}/files/${relevantReview.commit.oid}..${
                  lastOid || ''}`,
            });
          }
        }

        prsShown.push(pr.id);
        incomingPrs.push(reviewedPr);
      }

      // Incoming review requests.
      for (const pr of viewerPrsResult.data.reviewRequests.nodes || []) {
        if (!pr || pr.__typename !== 'PullRequest' ||
            prsShown.includes(pr.id)) {
          continue;
        }

        const incomingPr: api.PullRequest = {
          ...convertPrFields(pr),
          status: {type: 'ReviewRequired'},
        };

        incomingPrs.push(incomingPr);
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
    outgoingPr: api.PullRequest): api.Review[] {
  const result = [];
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

    result.push(convertReviewFields(review));
  }

  const reviewsRequestingChanges = result.filter(
      (review) =>
          review.reviewState === PullRequestReviewState.CHANGES_REQUESTED);
  const reviewsApproved = result.filter(
      (review) => review.reviewState === PullRequestReviewState.APPROVED);
  let eventReviews = null;

  if (reviewsRequestingChanges.length) {
    eventReviews = reviewsRequestingChanges;
  } else if (reviewsApproved.length) {
    eventReviews = reviewsApproved;
  } else if (result.length) {
    eventReviews = result;
  }

  if (eventReviews) {
    outgoingPr.events.push({
      type: 'OutgoingReviewEvent',
      reviews: eventReviews,
    });
  }
  return result;
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

  return {
    type: 'MentionedEvent',
    text: latest.bodyText,
    mentionedAt: Date.parse(latest.createdAt),
    url: latest.url,
  };
}

const prsQuery = gql`
query ViewerPullRequests($login: String!, $reviewRequestsQueryString: String!, $reviewedQueryString: String!, $mentionsQueryString: String!) {
	user(login: $login) {
    pullRequests(last: 20, states: [OPEN]) {
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
  id
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
}

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
