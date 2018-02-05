import {sendNotification} from './controllers/notifications';
import {DashSecrets} from './dash-server';

type UserHook = {
  login: string;
};

type ReviewHook = {
  state: 'approved'|'changes_requested'|'commented', user: UserHook;
};

type PullRequestHook = {
  title: string; user: UserHook;
};

type RepositoryHook = {
  name: string;
};

type PullRequestReviewHook = {
  action: string; review: ReviewHook; pull_request: PullRequestHook;
  repository: RepositoryHook;
};

// Triggered when the status of a Git commit changes.
export async function handleStatus(_hookBody: string) {
}

// Triggered when a pull request is assigned, unassigned, labeled, unlabeled,
// opened, edited, closed, reopened, or synchronized
export async function handlePullRequest(_hookBody: {}) {
}

export async function handlePullRequestReview(
    secrets: DashSecrets, hookData: PullRequestReviewHook) {
  if (hookData.action === 'submitted') {
    const review = hookData.review;
    const repo = hookData.repository;
    const pullReq = hookData.pull_request;

    let notification = null;

    if (review.state === 'approved') {
      notification = {
        title: `${review.user.login} approved your PR`,
        body: `[${repo.name}] ${pullReq.title}`,
      };
    } else if (review.state === 'changes_requested') {
      notification = {
        title: `${review.user.login} requested changes`,
        body: `[${repo.name}] ${pullReq.title}`,
      };
    } else if (review.state === 'commented') {
      notification = {
        title: `${review.user.login} commented on your PR`,
        body: `[${repo.name}] ${pullReq.title}`,
      };
    }

    if (notification) {
      const notificationRecipient = pullReq.user.login;
      sendNotification(secrets, notificationRecipient, notification);
    }
  } else {
    throw new Error(
        `Unexpected Pull Request Review Action: ${hookData.action}`);
  }
}
