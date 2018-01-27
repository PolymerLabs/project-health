import {PullRequestReviewState} from './gql-types';

export interface PullRequest {
  repository: string;
  title: string;
  url: string;
  author: string;
  createdAt: number;
  avatarUrl: string;
  status: PullRequestStatus;
}

export const enum PullRequestStatus {
  Unknown = 'Unknown',  // Status is not yet known or implemented

  // Not necessarily actionable.
  NoActionRequired = 'NoActionRequired',  // Viewer has approved
  NewActivity =
      'NewActivity',  // Viewer has approved, but there is new activity
  StatusChecksPending =
      'StatusChecksPending',  // Viewer has approval, waiting on status checks
  WaitingReview = 'WaitingReview',  // Viewer is waiting on a review

  // Actionable - outgoing
  PendingChanges = 'PendingChanges',  // Viewer's pull PR requires changes
  PendingMerge = 'PendingMerge',      // Merge required by viewer
  StatusChecksFailed =
      'StatusChecksFailed',  // One of the status checks are failing
  // Actionable - incoming
  ReviewRequired = 'ReviewRequired',  // Review required by viewer
  ApprovalRequired =
      'ApprovalRequired',           // Viewer has reviewed but not approved
  MergeRequired = 'MergeRequired',  // Viewer approved, author unable to merge
}

export interface OutgoingPullRequest extends PullRequest {
  reviews: Review[];
  reviewRequests: string[];
}

export interface IncomingPullRequest extends PullRequest {
  myReview: Review|null;
}

export interface DashResponse {
  outgoingPrs: OutgoingPullRequest[];
  incomingPrs: IncomingPullRequest[];
}

export interface Review {
  author: string;
  createdAt: number;
  reviewState: PullRequestReviewState;
}
