// These are the types for the payloads from GitHub web hooks.

type User = {
  login: string;
};

type PullRequest = {
  number: number; title: string; user: User; html_url: string;
};

type ReviewHook = {
  state: string, user: User;
};

type Repository = {
  name: string; owner: {login: string;};
};

export type PullRequestReviewHook = {
  action: string; review: ReviewHook; pull_request: PullRequest;
  repository: Repository;
};

export type PullRequestHook = {
  action: string; pull_request: PullRequest; repository: Repository;
  requested_reviewer: User;
};

export type StatusHook = {
  sha: string; name: string; state: 'error' | 'failure' | 'pending' | 'success';
  description: string;
  repository: Repository;
  commit: {author: User;}
};
