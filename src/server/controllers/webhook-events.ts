import gql from 'graphql-tag';

import {StatusToPRQuery} from '../../types/gql-types';
import {github} from '../../utils/github';
import {sendNotification} from '../controllers/notifications';
import {userModel} from '../models/userModel';

type User = {
  login: string;
};

type ReviewHook = {
  state: 'approved'|'changes_requested'|'commented', user: User;
};

type PullRequest = {
  title: string; user: User; html_url: string;
  requested_reviewers: Reviewer[];
};

type RepositoryHook = {
  name: string;
};

type Reviewer = {
  login: string;
};

type PullRequestHook = {
  action: string;
  pull_request: PullRequest;
  repository: RepositoryHook;
};

type PullRequestReviewHook = {
  action: string; review: ReviewHook; pull_request: PullRequest;
  repository: RepositoryHook;
};

type StatusHook = {
  sha: string; name: string; state: 'error' | 'failure' | 'pending' | 'success';
  description: string;
  repository: RepositoryHook;
  commit: {author: User;}
};

// Triggered when the status of a Git commit changes.
export async function handleStatus(hookData: StatusHook) {
  if (hookData.state !== 'error' && hookData.state !== 'failure') {
    return;
  }

  // There was an error that should be reported to the PR Owner
  const author = hookData.commit.author;
  const loginDetails = await userModel.getLoginDetails(author.login);
  if (!loginDetails) {
    // Commit author isn't logged in so not token to figure out
    // appropriate PR's affect by this commit status
    return;
  }

  const repo = hookData.repository;
  const statusPR = await github().query<StatusToPRQuery>({
    query: statusToPR,
    variables: {
      query: `type:pr repo:${hookData.name} ${hookData.sha}`,
    },
    fetchPolicy: 'network-only',
    // We use the commit author's token for this request
    context: {token: loginDetails.token}
  });

  if (!statusPR.data.pullRequests || !statusPR.data.pullRequests.nodes) {
    return;
  }

  for (const prData of statusPR.data.pullRequests.nodes) {
    if (!prData || prData.__typename !== 'PullRequest') {
      continue;
    }

    // We'll want to message the author
    if (!prData.author) {
      continue;
    }

    // If we can't confirm that the PR commit === the status commit - return;
    if (!prData.commits.nodes || prData.commits.nodes.length === 0) {
      continue;
    }

    // Ensure the commit exists
    const commitNode = prData.commits.nodes[0];
    if (!commitNode) {
      continue;
    }

    const commit = commitNode.commit;
    if (commit.oid === hookData.sha) {
      await sendNotification(prData.author.login, {
        title: hookData.description,
        body: `[${repo.name}] ${prData.title}`,
        requireInteraction: false,
        icon: '/assets/notification-images/icon-192x192.png',
        data: {
          url: prData.url,
        }
      });
    }
  }
}

// Triggered when a pull request is assigned, unassigned, labeled, unlabeled,
// opened, edited, closed, reopened, or synchronized
export async function handlePullRequest(hookBody: PullRequestHook) {
  if (hookBody.action !== 'review_requested') {
    return;
  }

  const pullRequest = hookBody.pull_request;
  const repo = hookBody.repository;
  const user = pullRequest.user;
  const reviewers = pullRequest.requested_reviewers;
  const notification = {
    title: `${user.login} requested a review`,
    body: `[${repo.name}] ${pullRequest.title}`,
    requireInteraction: true,
    icon: '/assets/notification-images/icon-192x192.png',
    data: {
      url: pullRequest.html_url,
    }
  };
  for (const reviewer of reviewers) {
    await sendNotification(reviewer.login, notification);
  }
}

export async function handlePullRequestReview(hookData: PullRequestReviewHook) {
  if (hookData.action === 'submitted') {
    const review = hookData.review;
    const repo = hookData.repository;
    const pullReq = hookData.pull_request;

    let notificationTitle = null;

    if (review.state === 'approved') {
      notificationTitle = `${review.user.login} approved your PR`;
    } else if (review.state === 'changes_requested') {
      notificationTitle =  `${review.user.login} requested changes`;
    } else if (review.state === 'commented') {
      if (review.user.login === pullReq.user.login) {
        // If the PR author is the commenter, do nothing;
        return;
      }

      notificationTitle = `${review.user.login} commented on your PR`;
    }
    
    if (notificationTitle) {
      sendNotification(pullReq.user.login, {
        title: notificationTitle,
        body: `[${repo.name}] ${pullReq.title}`,
        requireInteraction: true,
        icon: '/assets/notification-images/icon-192x192.png',
        data: {
          url: pullReq.html_url,
        },
      });
    }
  } else {
    throw new Error(
        `Unexpected Pull Request Review Action: ${hookData.action}`);
  }
}

const statusToPR = gql`
query StatusToPR($query: String!) {
  pullRequests: search (
    first: 10, 
    type: ISSUE,
    query: $query
  ) {
    nodes {
      ... on PullRequest {
        number, 
        title,
        url,
        author {
          login
        },
        commits(last: 1) {
          nodes {
            commit {
              oid,
            }
          }
        }
      }
    }
  }
}
`;