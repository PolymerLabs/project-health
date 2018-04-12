import {commentFieldsFragment} from '../../types/gql-types';

export function getIssueLastActivity(
    assigneeLogin: string, commentFragment: commentFieldsFragment) {
  let lastActivity = null;

  // If the user opened the issue - we don't want the createdAt to be treated
  // as new activity.
  if (!commentFragment.author ||
      commentFragment.author.login !== assigneeLogin) {
    lastActivity = new Date(commentFragment.createdAt).getTime();
  }

  if (!commentFragment.comments.nodes) {
    return lastActivity;
  }

  if (commentFragment.comments.nodes.length === 0) {
    return lastActivity;
  }

  if (commentFragment.comments.nodes.length > 1) {
    throw new Error('commentFields should have, at most, 1 comment.');
  }

  const lastComment = commentFragment.comments.nodes[0];
  if (!lastComment) {
    return lastActivity;
  }

  if (lastComment.author && lastComment.author.login === assigneeLogin) {
    // If the assignee is the author of the last comment, then the last
    // activity can be null, meaning we'll treat it as no new activity.
    return null;
  }
  return new Date(lastComment.createdAt).getTime();
}
