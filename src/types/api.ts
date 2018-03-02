import {MergeableState, PullRequestReviewState} from './gql-types';

export interface OrgWebHookState {
  name: string;
  login: string;
  viewerCanAdminister: boolean;
  hookEnabled: boolean;
}

export interface RepoDetails {
  allow_rebase_merge: boolean;
  allow_squash_merge: boolean;
  allow_merge_commit: boolean;
}

export interface OutgoingPullRequest extends PullRequest {
  repoDetails: RepoDetails;
  mergeable: MergeableState;
}

export interface PullRequest {
  repository: string;
  title: string;
  url: string;
  author: string;
  createdAt: number;
  avatarUrl: string;
  status: PullRequestStatus;
  events: PullRequestEvent[];
}

export type PullRequestStatus =
    UnknownStatus|NoActionRequired|NewActivity|StatusChecksPending|
    WaitingReview|PendingChanges|PendingMerge|StatusChecksFailed|ReviewRequired|
    ApprovalRequired|MergeRequired|NoReviewers;

export type PullRequestEvent =
    OutgoingReviewEvent|MyReviewEvent|NewCommitsEvent|MentionedEvent;

export interface DashboardUser {
  login: string;
  isCurrentUser: boolean;
  name: string|null;
  avatarUrl: string|null;
}

export interface OutgoingDashResponse {
  timestamp: string;
  user: DashboardUser;
  prs: OutgoingPullRequest[];
}

export interface IncomingDashResponse {
  timestamp: string;
  prs: PullRequest[];
}

export interface Review {
  author: string;
  createdAt: number;
  reviewState: PullRequestReviewState;
}

export interface JSONAPIResponse<T> {
  error?: {code: string; message: string;};
  data?: T;
}

export interface LoginResponse { status: string; }

export interface LastKnownResponse { lastKnownUpdate: string|null; }

/** Not necessarily actionable. */

interface UnknownStatus {
  type: 'UnknownStatus';
}

// Viewer has approved
interface NoActionRequired {
  type: 'NoActionRequired';
}

// Viewer has approved, but there is new activity
interface NewActivity {
  type: 'NewActivity';
}

// Viewer has approval, waiting on status checks
interface StatusChecksPending {
  type: 'StatusChecksPending';
}

// Viewer is waiting on a review
interface WaitingReview {
  type: 'WaitingReview';
  reviewers: string[];
}

/** Actionable - outgoing */

// Viewer's pull PR requires changes
interface PendingChanges {
  type: 'PendingChanges';
}

// Merge required by viewer
interface PendingMerge {
  type: 'PendingMerge';
}

// One of the status checks are failing
interface StatusChecksFailed {
  type: 'StatusChecksFailed';
}

// No requested reviewers
interface NoReviewers {
  type: 'NoReviewers';
}

/** Actionable - incoming */

// Review required by viewer
interface ReviewRequired {
  type: 'ReviewRequired';
}

// Viewer has reviewed but not approved
interface ApprovalRequired {
  type: 'ApprovalRequired';
}

// Viewer approved, author unable to merge
interface MergeRequired {
  type: 'MergeRequired';
}

export interface OutgoingReviewEvent {
  type: 'OutgoingReviewEvent';
  reviews: Review[];
}

export interface MyReviewEvent {
  type: 'MyReviewEvent';
  review: Review;
}

export interface NewCommitsEvent {
  type: 'NewCommitsEvent';
  count: number;
  additions: number;
  deletions: number;
  changedFiles: number;
  lastPushedAt: number;
  url: string;
}

export interface MentionedEvent {
  type: 'MentionedEvent';
  text: string;
  mentionedAt: number;
  url: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  requireInteraction: boolean;
  icon: string;
  data: NotificationURLData|void;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface NotificationURLData { url: string; }

export type SWClientMessage<T> = {
  action: 'push-received',
  data: T|void,
};
