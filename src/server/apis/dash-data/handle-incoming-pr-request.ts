import * as express from 'express';

import * as api from '../../../types/api';
import {IncomingPullRequestsQuery, mentionedFieldsFragment, PullRequestReviewState, reviewFieldsFragment} from '../../../types/gql-types';
import {github} from '../../../utils/github';
import {userModel, UserRecord} from '../../models/userModel';
import {getPRLastActivity, LastComment} from '../../utils/get-pr-last-activity';
import {issueHasNewActivity} from '../../utils/issue-has-new-activity';
import {DataAPIResponse} from '../api-router/abstract-api-router';
import * as responseHelper from '../api-router/response-helper';
import {convertPrFields, convertReviewFields, incomingPrsQuery} from '../dash-data';

type MyReviewFields = reviewFieldsFragment&{commit: {oid: string}};

/**
 * Handles a response for incoming pull requests.
 */
export async function handleIncomingPRRequest(
    request: express.Request, userRecord: UserRecord):
    Promise<DataAPIResponse<api.IncomingDashResponse>> {
  const dashLogin = request.query.login || userRecord.username;
  const openPrQuery = 'is:open is:pr archived:false';
  const reviewedQueryString =
      `reviewed-by:${dashLogin} ${openPrQuery} -author:${dashLogin}`;
  const reviewRequestsQueryString =
      `review-requested:${dashLogin} ${openPrQuery}`;
  const mentionsQueryString = `${reviewedQueryString} mentions:${dashLogin}`;

  const viewerPrsResult = await github().query<IncomingPullRequestsQuery>({
    query: incomingPrsQuery,
    variables: {
      login: dashLogin,
      reviewRequestsQueryString,
      reviewedQueryString,
      mentionsQueryString,
    },
    fetchPolicy: 'network-only',
    context: {
      token: userRecord.githubToken,
    }
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
    const mention = getLastMentioned(item, dashLogin);
    if (mention) {
      mentioned.set(item.id, mention);
    }
  }

  let loginRecord: UserRecord|null = null;
  let lastViewedInfo: {[issue: string]: number}|null = null;
  if (dashLogin === userRecord.username) {
    loginRecord = await userModel.getUserRecord(dashLogin);
    lastViewedInfo = await userModel.getAllLastViewedInfo(dashLogin);
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

    // No review has actually been submitted yet. This PR should appear under
    // review requests instead.
    if (!relevantReview || relevantReview.state === 'PENDING') {
      continue;
    }

    // Cast because inner type has less strict type for __typename.
    const myReview: api.Review =
        convertReviewFields(relevantReview as reviewFieldsFragment);

    let lastComment: LastComment|null = null;
    if (pr.comments.nodes && pr.comments.nodes.length > 0) {
      const lastPRComment = pr.comments.nodes[0];
      if (lastPRComment) {
        lastComment = {
          createdAt: new Date(lastPRComment.createdAt).getTime(),
          author: null,
        };

        if (lastPRComment.author && lastPRComment.author.login) {
          lastComment.author = lastPRComment.author.login;
        }
      }
    }

    const reviewedPr: api.PullRequest = {
      ...convertPrFields(pr),
      hasNewActivity: false,
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
        if (!myReview || !node || !node.commit.authoredDate) {
          continue;
        }
        const authoredDate = Date.parse(node.commit.authoredDate);
        if (authoredDate <= myReview.createdAt) {
          continue;
        }
        additions += node.commit.additions;
        deletions += node.commit.deletions;
        changedFiles += node.commit.changedFiles;
        if (authoredDate > lastPushedAt) {
          lastPushedAt = Date.parse(node.commit.authoredDate);
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

    if (lastViewedInfo && loginRecord) {
      const lastActivity =
          await getPRLastActivity(userRecord.username, reviewedPr, lastComment);
      if (lastActivity) {
        reviewedPr.hasNewActivity = await issueHasNewActivity(
            loginRecord, lastActivity, lastViewedInfo[pr.id]);
      }
    }

    prsShown.push(pr.id);
    incomingPrs.push(reviewedPr);
  }

  // Incoming review requests.
  for (const pr of viewerPrsResult.data.reviewRequests.nodes || []) {
    if (!pr || pr.__typename !== 'PullRequest' || prsShown.includes(pr.id)) {
      continue;
    }

    if (pr.viewerSubscription === 'IGNORED' ||
        pr.viewerSubscription === 'UNSUBSCRIBED') {
      continue;
    }

    const incomingPr: api.PullRequest = {
      ...convertPrFields(pr),
      status: {type: 'ReviewRequired'},
    };

    incomingPrs.push(incomingPr);
  }

  return responseHelper.data({
    timestamp: new Date().toISOString(),
    // Sort newest first.
    prs: sortIncomingPRs(incomingPrs),
  });
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
