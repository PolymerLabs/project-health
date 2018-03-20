import {WebHookHandleResponse} from '../../apis/github-webhook';
import {getPRTag, sendNotification} from '../../controllers/notifications';
import {CommitDetails, pullRequestsModel} from '../../models/pullRequestsModel';
import {LoginDetails, userModel} from '../../models/userModel';
import {getPRDetailsFromCommit, PullRequestDetails} from '../../utils/get-pr-from-commit';
import {performAutomerge} from '../../utils/perform-automerge';

import {StatusHook} from './types';

const STATE_SETTLING_TIMOUT = 5 * 1000;

async function handleFailingStatus(
    hookData: StatusHook,
    prDetails: PullRequestDetails,
    savedCommitDetails: CommitDetails|null): Promise<WebHookHandleResponse> {
  const webhookResponse: WebHookHandleResponse = {
    handled: false,
    notifications: null,
    message: null,
  };

  if (!savedCommitDetails || savedCommitDetails.status !== hookData.state) {
    webhookResponse.handled = true;

    const repo = hookData.repository;

    const results = await sendNotification(prDetails.author, {
      title: hookData.description,
      body: `[${hookData.repository.name}] ${prDetails.title}`,
      requireInteraction: false,
      data: {
        url: prDetails.url,
      },
      tag: getPRTag(repo.owner.login, repo.name, prDetails.number),
    });
    webhookResponse.notifications = results;
  } else {
    webhookResponse.message = 'The previous commit details and the hook ' +
        'details are the same state.';
  }

  return webhookResponse;
}

async function handleSuccessStatus(
    loginDetails: LoginDetails,
    hookData: StatusHook): Promise<WebHookHandleResponse> {
  // We must add a delay to ensure that GitHub's API returns the most
  // up-to-date value, otherwise the status may be marked as 'pending' even
  // though the hook we have received is 'success' and it's the only status.
  await new Promise((resolve) => setTimeout(resolve, STATE_SETTLING_TIMOUT));

  const webhookResponse: WebHookHandleResponse = {
    handled: false,
    notifications: null,
    message: null,
  };

  const prDetails = await getPRDetailsFromCommit(
      loginDetails.githubToken, hookData.name, hookData.sha);
  if (!prDetails) {
    webhookResponse.message = 'Unable to find PR Details.';
    return webhookResponse;
  }

  // Ensure the PR is open
  if (prDetails.state !== 'OPEN') {
    webhookResponse.message = `PR is not open: '${prDetails.state}'`;
    return webhookResponse;
  }

  // If all commits state is success (all status checks passed) or
  if (prDetails.commit.state !== 'SUCCESS' && prDetails.commit.state !== null) {
    webhookResponse.message =
        `Status of the PR's commit is not 'SUCCESS' or 'null': '${
            prDetails.commit.state}'`;
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

    const repo = hookData.repository;

    const results = await sendNotification(prDetails.author, {
      title: `Auto-merge failed: '${msg}'`,
      body: `[${hookData.repository.name}] ${prDetails.title}`,
      requireInteraction: false,
      data: {
        url: prDetails.url,
      },
      tag: getPRTag(repo.owner.login, repo.name, prDetails.number),
    });

    webhookResponse.notifications = results;
    webhookResponse.message = `Unable to perform automerge: '${msg}'`;
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
      message: `Unable to find login details for '${author.login}'`,
    };
  }

  const prDetails = await getPRDetailsFromCommit(
      loginDetails.githubToken, hookData.name, hookData.sha);
  if (!prDetails) {
    return {
      handled: false,
      notifications: null,
      message: 'Unable to find PR Details for commit.',
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
    return handleSuccessStatus(loginDetails, hookData);
  }

  return {
    handled: false,
    notifications: null,
    message: `Unexpected status state: '${hookData.state}'`,
  };
}
