import {PullRequest} from '../../types/api';

export function getPRLastActivityTimestamp(pr: PullRequest): number|null {
  if (pr.events.length === 0) {
    return null;
  }
  const lastEvent = pr.events[pr.events.length - 1];

  let lastActivity = null;
  if (lastEvent.type === 'OutgoingReviewEvent') {
    lastActivity = lastEvent.reviews[lastEvent.reviews.length - 1].createdAt;
  } else if (lastEvent.type === 'MyReviewEvent') {
    lastActivity = lastEvent.review.createdAt;
  } else if (lastEvent.type === 'NewCommitsEvent') {
    lastActivity = lastEvent.lastPushedAt;
  } else if (lastEvent.type === 'MentionedEvent') {
    lastActivity = lastEvent.mentionedAt;
  }

  return lastActivity;
}
