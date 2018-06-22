// NOTE: Avoid import files here as this file is expected to build for commonJS
// and ES2015 modules meaning any imported files will be built with that
// module type as well (resulting in possibly unexpected results - like running
// commonJS code in the browser)

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
  repoDetails: RepoDetails|null;
  mergeable: 'MERGEABLE'|'CONFLICTING'|'UNKNOWN';
  automergeSelection: AutomergeSelection|null;
  automergeAvailable: boolean;
}

export interface PullRequest {
  id: string;
  repo: string;
  owner: string;
  number: number;
  title: string;
  url: string;
  author: string;
  createdAt: number;
  avatarUrl: string;
  status: PullRequestStatus;
  events: PullRequestEvent[];
  hasNewActivity: boolean;
}

export type PullRequestStatus =
    UnknownStatus|NoActionRequired|NewActivity|StatusChecksPending|
    WaitingReview|PendingChanges|PendingMerge|StatusChecksFailed|ReviewRequired|
    ApprovalRequired|MergeRequired|NoReviewers|ChangesRequested;

export type PullRequestEvent =
    OutgoingReviewEvent|MyReviewEvent|NewCommitsEvent|MentionedEvent;

export interface DashboardUser {
  login: string;
  isCurrentUser: boolean;
  name: string|null;
  avatarUrl: string|null;
}

export interface OutgoingPullRequestInfo {
  prs: OutgoingPullRequest[];
  totalCount: number;
  hasMore: boolean;
  cursor: string|null;
}

export interface OutgoingDashResponse extends OutgoingPullRequestInfo {
  timestamp: string;
  user: DashboardUser;
}

export interface IncomingDashResponse {
  timestamp: string;
  prs: PullRequest[];
}

export interface IssuesResponse {
  issues: Issue[];
}

export interface Label {
  name: string;
  description: string|null;
}

export interface LabelsResponse {
  labels: Label[];
}

export interface Review {
  author: string;
  createdAt: number;
  reviewState: 'PENDING'|'COMMENTED'|'APPROVED'|'CHANGES_REQUESTED'|'DISMISSED';
}

export interface GenericStatusResponse {
  status: string;
}

export interface LastKnownResponse {
  lastKnownUpdate: string|null;
  version: string|null;
}

export interface Repository {
  owner: string;
  name: string;
  avatarUrl: string|null;
}

export interface UserResponse {
  login: string;
  avatarUrl: string|null;
  repos: Repository[];
}

export interface OrgSettings {
  fileContents: string;
  lastUpdated: number;
  editors: string[];
}

export interface JSONAPIErrorResponse {
  error: {
    code: string,
    message: string,
  };
}

export interface JSONAPIDataResponse<T> {
  data: T;
}

export type JSONAPIResponse<T> = JSONAPIErrorResponse|JSONAPIDataResponse<T>;

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

interface ChangesRequested {
  type: 'ChangesRequested';
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
  data?: NotificationData;
  tag: string;
  icon?: string;
  badge?: string;
}

export interface NotificationPullRequestData {
  gqlId: string;
  state?: 'CLOSED'|'MERGED'|'OPEN';
}

export interface NotificationData {
  url: string;
  pullRequest?: NotificationPullRequestData;
}

export type SWClientMessage<T> = {
  action: 'push-received',
  data: T|void,
};

export type MergeType = 'manual'|'merge'|'squash'|'rebase';

export type AutomergeSelection = {
  mergeType: MergeType,
};

export type CheckPRPayload = {
  pullRequests: NotificationPullRequestData[],
};

export interface Issue {
  id: string;
  repo: string;
  owner: string;
  title: string;
  author: string;
  avatarUrl: string;
  createdAt: number;
  url: string;
  popularity: Popularity;
  hasNewActivity: boolean;
  status: IssueStatus;
}

export type IssueStatus =
    Assigned|Author|Involved|UnknownStatus|Untriaged|Unassigned|AssignedTo;

interface Assigned {
  type: 'Assigned';
}

interface Author {
  type: 'Author';
}

interface Involved {
  type: 'Involved';
}

interface Untriaged {
  type: 'Untriaged';
}

interface Unassigned {
  type: 'Unassigned';
}

interface AssignedTo {
  type: 'AssignedTo';
  users: string[];
}

export type Popularity = number&{
  _PopularityBrand: never;
};
