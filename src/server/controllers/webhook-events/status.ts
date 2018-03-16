import {WebHookHandleResponse} from '../../apis/github-webhook';
import {sendNotification} from '../../controllers/notifications';
import {CommitDetails, pullRequestsModel} from '../../models/pullRequestsModel';
import {LoginDetails, userModel} from '../../models/userModel';
import {getPRDetailsFromCommit, PullRequestDetails} from '../../utils/get-pr-from-commit';
import {performAutomerge} from '../../utils/perform-automerge';

import {StatusHook} from './types';

async function handleFailingStatus(
    hookData: StatusHook,
    prDetails: PullRequestDetails,
    savedCommitDetails: CommitDetails|null): Promise<WebHookHandleResponse> {
  const webhookResponse: WebHookHandleResponse = {
    handled: false,
    notifications: null,
  };

  if (!savedCommitDetails || savedCommitDetails.status !== hookData.state) {
    webhookResponse.handled = true;

    const results = await sendNotification(prDetails.author, {
      title: hookData.description,
      body: `[${hookData.repository.name}] ${prDetails.title}`,
      requireInteraction: false,
      icon: '/images/notification-images/icon-192x192.png',
      data: {
        url: prDetails.url,
      }
    });
    webhookResponse.notifications = results;
  }

  return webhookResponse;
}

async function handleSuccessStatus(
    loginDetails: LoginDetails,
    hookData: StatusHook,
    prDetails: PullRequestDetails): Promise<WebHookHandleResponse> {
  const webhookResponse: WebHookHandleResponse = {
    handled: false,
    notifications: null,
  };

  // If all commits state is success (all status checks passed) or
  if (prDetails.commit.state !== 'SUCCESS' && prDetails.commit.state !== null) {
    return webhookResponse;
  }

  webhookResponse.handled = true;

  try {
    await performAutomerge(loginDetails.githubToken, hookData.name, prDetails);
  } catch (err) {
    // Githubs response will have a slightly more helpful message
    // under err.error.message.
    let msg = err.message;
    if (err.error && err.error.message) {
      msg = err.error.message;
    }

    const results = await sendNotification(prDetails.author, {
      title: `Auto-merge failed: '${msg}'`,
      body: `[${hookData.repository.name}] ${prDetails.title}`,
      requireInteraction: false,
      icon: '/images/notification-images/icon-192x192.png',
      data: {
        url: prDetails.url,
      }
    });

    webhookResponse.notifications = results;
  }


  return webhookResponse;
}

// Triggered when the status of a Git commit changes.
export async function handleStatus(hookData: StatusHook):
    Promise<WebHookHandleResponse> {
  const author = hookData.commit.author;
  const loginDetails = await userModel.getLoginDetails(author.login);
  if (!loginDetails) {
    // Commit author isn't logged in so we have no GitHub token to find the
    // appropriate PR's affected by this status change
    return {
      handled: false,
      notifications: null,
    };
  }

  const prDetails = await getPRDetailsFromCommit(
      loginDetails.githubToken, hookData.name, hookData.sha);
  if (!prDetails) {
    return {
      handled: false,
      notifications: null,
    };
  }

  // Get previous state
  const savedCommitDetails = await pullRequestsModel.getCommitDetails(
      prDetails.id,
      prDetails.commit.oid,
  );

  // Save latest state
  await pullRequestsModel.setCommitStatus(
      prDetails.id,
      prDetails.commit.oid,
      hookData.state,
  );

  if (hookData.state === 'error' || hookData.state === 'failure') {
    return handleFailingStatus(
        hookData,
        prDetails,
        savedCommitDetails,
    );
  } else if (hookData.state === 'success') {
    return handleSuccessStatus(loginDetails, hookData, prDetails);
  }
  return {handled: false, notifications: null};
}
