export interface PullRequest {
  repository: string;
  title: string;
  number: number;
  avatarUrl: string;
  approvedBy: string[];
  changesRequestedBy: string[];
  commentedBy: string[];
  pendingReviews: string[];
  statusState: 'passed'|'pending'|'failed';
}

export interface DashResponse {
  prs: PullRequest[];
}
