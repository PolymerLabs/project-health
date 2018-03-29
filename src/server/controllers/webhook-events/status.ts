import {WebHookHandleResponse} from '../../apis/github-webhook';
import {getPRTag, sendNotification} from '../../controllers/notifications';
import {CommitDetails, pullRequestsModel} from '../../models/pullRequestsModel';
import {userModel, UserRecord} from '../../models/userModel';
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
      icon: '/images/notification-images/icon-error-192x192.png',
      data: {
        url: prDetails.url,
        pullRequest: {
          gqlId: prDetails.gqlId,
        },
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
    userRecord: UserRecord,
    hookData: StatusHook,
    prDetails: PullRequestDetails): Promise<WebHookHandleResponse> {
  const webhookResponse: WebHookHandleResponse = {
    handled: true,
    notifications: null,
    message: null,
  };

  // Check if the latest commits status checks have passed
  if (prDetails.commit.state !== 'SUCCESS' && prDetails.commit.state !== null) {
    webhookResponse.message =
        `Status of the PR's commit is not 'SUCCESS' or 'null': '${
            prDetails.commit.state}'`;
    return webhookResponse;
  }

  const repo = hookData.repository;

  const automergeOpts = await pullRequestsModel.getAutomergeOpts(
      prDetails.owner, prDetails.repo, prDetails.number);

  let notificationTitle = null;
  let icon = '/images/notification-images/icon-completed-192x192.png';

  if (!automergeOpts || !automergeOpts.mergeType ||
      automergeOpts.mergeType === 'manual') {
    notificationTitle = 'PR is ready to merge';
    webhookResponse.message = 'PR is ready to merge, automerge is not setup';
  } else {
    try {
      await performAutomerge(
          userRecord.githubToken, prDetails, automergeOpts.mergeType);

      notificationTitle = `Automerge complete for '${prDetails.title}'`;
      icon = '/images/notification-images/icon-completed-192x192.png';
      webhookResponse.message = 'Automerge successful';
    } catch (err) {
      // Githubs response will have a slightly more helpful message
      // under err.error.message.
      let msg = err.message;
      if (err.error && err.error.message) {
        msg = err.error.message;
      }

      notificationTitle = `Automerge failed for '${prDetails.title}'`;
      icon = '/images/notification-images/icon-error-192x192.png';

      webhookResponse.message = `Unable to perform automerge: '${msg}'`;
    }
  }

  const results = await sendNotification(prDetails.author, {
    title: notificationTitle,
    body: `[${hookData.repository.name}] ${prDetails.title}`,
    requireInteraction: false,
    icon,
    data: {
      url: prDetails.url,
      pullRequest: {
        gqlId: prDetails.gqlId,
      },
    },
    tag: getPRTag(repo.owner.login, repo.name, prDetails.number),
  });
  webhookResponse.notifications = results;
  return webhookResponse;
}

// Triggered when the status of a Git commit changes.
export async function handleStatus(hookData: StatusHook):
    Promise<WebHookHandleResponse> {
  const author = hookData.commit.author;
  const userRecord = await userModel.getUserRecord(author.login);
  if (!userRecord) {
    // Commit author isn't logged in so we have no GitHub token to find the
    // appropriate PR's affected by this status change
    return {
      handled: false,
      notifications: null,
      message: `Unable to find login details for '${author.login}'`,
    };
  }

  const webhookResponse: WebHookHandleResponse = {
    handled: false,
    notifications: null,
    message: null,
  };

  const prDetails = await getPRDetailsFromCommit(
      userRecord.githubToken, hookData.name, hookData.sha);
  if (!prDetails) {
    webhookResponse.message =
        'Unable to find PR Details for commit to store state.';
    return webhookResponse;
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

  // If the PR is not open, don't process the event
  if (prDetails.state !== 'OPEN') {
    webhookResponse.message = 'The PR is no longer open.';
    return webhookResponse;
  }

  // If the hooks SHA is not the latest commit in the PR, don't process the
  // event
  if (prDetails.commit.oid !== hookData.sha) {
    webhookResponse.message = 'The hooks payload has an outdated commit SHA.';
    return webhookResponse;
  }

  if (hookData.state === 'error' || hookData.state === 'failure') {
    return handleFailingStatus(
        hookData,
        prDetails,
        savedCommitDetails,
    );
  } else if (hookData.state === 'success') {
    return handleSuccessStatus(userRecord, hookData, prDetails);
  }

  return {
    handled: false,
    notifications: null,
    message: `Unhandled state: '${hookData.state}'`,
  };
}
