import {PullRequestReviewState} from './gql-types';

export interface PullRequest {
  repository: string;
  title: string;
  url: string;
  author: string;
  createdAt: number;
  avatarUrl: string;
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
