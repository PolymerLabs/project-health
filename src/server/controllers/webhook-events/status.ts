import {WebHookHandleResponse} from '../../apis/github-webhook';
import {getPRTag, sendNotification} from '../../controllers/notifications';
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
    hookData: StatusHook,
    oldPRDetails: PullRequestDetails): Promise<WebHookHandleResponse> {
  const webhookResponse: WebHookHandleResponse = {
    handled: true,
    notifications: null,
    message: null,
  };

  const automergeOpts = await pullRequestsModel.getAutomergeOpts(
      oldPRDetails.owner, oldPRDetails.repo, oldPRDetails.number);
  if (!automergeOpts) {
    webhookResponse.message = 'No automerge options configured.';
    return webhookResponse;
  }

  const mergeType = automergeOpts.mergeType;
  if (!mergeType || mergeType === 'manual') {
    webhookResponse.message = `A non-automerge type selected: ${mergeType}`;
    return webhookResponse;
  }

  const repo = hookData.repository;
  try {
    const mergeComplete =
        await performAutomerge(loginDetails, hookData, mergeType);

    if (mergeComplete) {
      const results = await sendNotification(oldPRDetails.author, {
        title: `Automerge complete for '${oldPRDetails.title}'`,
        body: `[${hookData.repository.name}] ${oldPRDetails.title}`,
        requireInteraction: false,
        data: {
          url: oldPRDetails.url,
        },
        tag: getPRTag(repo.owner.login, repo.name, oldPRDetails.number),
      });

      webhookResponse.notifications = results;
      webhookResponse.message = 'Automerge successful';
    } else {
    }
  } catch (err) {
    // Githubs response will have a slightly more helpful message
    // under err.error.message.
    let msg = err.message;
    if (err.error && err.error.message) {
      msg = err.error.message;
    }

    const results = await sendNotification(oldPRDetails.author, {
      title: `Auto-merge failed: '${msg}'`,
      body: `[${hookData.repository.name}] ${oldPRDetails.title}`,
      requireInteraction: false,
      data: {
        url: oldPRDetails.url,
      },
      tag: getPRTag(repo.owner.login, repo.name, oldPRDetails.number),
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
      message: 'Unable to find PR Details for commit to store state.',
    };
  }

  // Get previous state
  const savedCommitDetails = await pullRequestsModel.getCommitDetails(
      prDetails.owner,
      prDetails.repo,
      prDetails.number,
      prDetails.commit.oid,
  );

  // Save latest state
  await pullRequestsModel.setCommitStatus(
      prDetails.owner,
      prDetails.repo,
      prDetails.number,
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

  return {
    handled: false,
    notifications: null,
    message: `Unhandled state: '${hookData.state}'`,
  };
}
