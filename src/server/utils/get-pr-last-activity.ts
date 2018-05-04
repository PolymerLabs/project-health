import {PullRequest} from '../../types/api';

export interface LastComment {
  createdAt: number;
  author: string|null;
}

export function getPRLastActivity(
    userLogin: string, pr: PullRequest, lastComment?: LastComment|null): number|
    null {
  let lastActivity = pr.author === userLogin ? null : pr.createdAt;

  if (pr.events.length > 0) {
    const lastEvent = pr.events[pr.events.length - 1];
    if (lastEvent.type === 'OutgoingReviewEvent') {
      if (lastEvent.reviews.length > 0) {
        lastActivity =
            lastEvent.reviews[lastEvent.reviews.length - 1].createdAt;
      }
    } else if (lastEvent.type === 'MyReviewEvent') {
      if (lastEvent.review.author === userLogin) {
        // If the author of Review is the user, we shouldn't mark it as new.
        return null;
      }

      lastActivity = lastEvent.review.createdAt;
    } else if (lastEvent.type === 'NewCommitsEvent') {
      lastActivity = lastEvent.lastPushedAt;
    } else if (lastEvent.type === 'MentionedEvent') {
      lastActivity = lastEvent.mentionedAt;
    }
  }

  // If there is a comment on the PR, see if it's newer than the above events
  if (lastComment) {
    if (lastActivity === null || lastComment.createdAt > lastActivity) {
      if (lastComment.author === userLogin) {
        // No new activity if author is the user
        return null;
      }
      lastActivity = lastComment.createdAt;
    }
  }

  return lastActivity;
}
