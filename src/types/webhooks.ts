export type WebhookType = 'check_run'|'check_suite'|'commit_comment'|'create'|
    'delete'|'deployment'|'deployment_status'|'fork'|'gollum'|'installation'|
    'installation_repositories'|'issue_comment'|'issues'|'label'|
    'marketplace_purchase'|'member'|'membership'|'milestone'|'organization'|
    'org_block'|'page_build'|'project_card'|'project_column'|'project'|'public'|
    'pull_request_review_comment'|'pull_request_review'|'pull_request'|'push'|
    'repository'|'repository_vulnerability_alert'|'release'|'status'|'team'|
    'team_add'|'watch';

export type WebhookPayload = PullRequestPayload|PullRequestReviewPayload|
    InstallationPayload|InstallationRepositoriesPayload;

interface TypedPayload {
  type: WebhookType;
  installation?: {
    id: number,
  };
}

export type PullRequestPayload =
    PullRequestOtherPayload|PullRequestReviewRequestedPayload|StatusPayload;

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

export interface InstallationPayload extends TypedPayload {
  type: 'installation';
  action: 'created'|'deleted';
  installation: Installation;
  repositories?: RepositoryReference[];
}

export interface InstallationRepositoriesPayload extends TypedPayload {
  type: 'installation_repositories';
  action: 'added'|'removed';
  repository_selection: 'selected'|'all';
  installation: Installation;
  repositories_added: RepositoryReference[];
  repositories_removed: RepositoryReference[];
}

export interface StatusPayload extends TypedPayload {
  type: 'status';
  sha: string;
  name: string;
  state: 'error'|'failure'|'pending'|'success';
  description: string|null;
  target_url: string|null;
  branches: Array<{
    name: string,
    commit: {
      sha: string,
      url: string,
    },
  }>;
  commit: {
    author: {
      login: string,
    },
    sha: string,
  };
  repository: Repository;
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

interface RepositoryReference {
  id: number;
  name: string;
  full_name: string;

  private: boolean;
}

interface Review {
  state: 'approved'|'changes_requested'|'commented';
  user: User;
  commit_id: string;
}

interface Installation {
  id: number;
  repository_selection: 'all'|'selected';
  permissions: {
    [name: string]: string,
  };
  events: string[];
  account: {
    login: string,
    avatar_url: string,
    type: 'User'|'Organization',
  };
}
