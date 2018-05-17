export type WebhookType = 'check_run'|'check_suite'|'commit_comment'|'create'|
    'delete'|'deployment'|'deployment_status'|'fork'|'gollum'|'installation'|
    'installation_repositories'|'issue_comment'|'issues'|'label'|
    'marketplace_purchase'|'member'|'membership'|'milestone'|'organization'|
    'org_block'|'page_build'|'project_card'|'project_column'|'project'|'public'|
    'pull_request_review_comment'|'pull_request_review'|'pull_request'|'push'|
    'repository'|'repository_vulnerability_alert'|'release'|'status'|'team'|
    'team_add'|'watch';

export type WebhookPayload = PullRequestPayload|PullRequestReviewPayload;

interface TypedPayload {
  type: WebhookType;
  installation?: {
    id: number,
  };
}

export type PullRequestPayload =
    PullRequestOtherPayload|PullRequestReviewRequestedPayload;

interface PullRequestBasePayload extends TypedPayload {
  type: 'pull_request';
  number: number;
  pull_request: PullRequest;
  repository: Repository;
}

export interface PullRequestOtherPayload extends PullRequestBasePayload {
  action: 'assigned'|'unassigned'|'review_request_removed'|'labeled'|
      'unlabeled'|'opened'|'edited'|'closed'|'reopened';
}

export interface PullRequestReviewRequestedPayload extends
    PullRequestBasePayload {
  action: 'review_requested';
  requested_reviewer: User;
}

export interface PullRequestReviewPayload extends TypedPayload {
  type: 'pull_request_review';
  action: 'submitted'|'edited'|'dismissed';
  pull_request: PullRequest;
  repository: Repository;
  review: Review;
}

interface PullRequest {
  number: number;
  title: string;
  user: User;
  html_url: string;
}

interface User {
  login: string;
}

interface Repository {
  name: string;
  owner: {
    login: string,
  };
  full_name: string;
}

interface Review {
  state: 'approved'|'changes_requested'|'commented';
  user: User;
  commit_id: string;
}
