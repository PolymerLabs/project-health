import {WebHookHandleResponse} from '../../apis/github-webhook';
import {sendNotification} from '../../controllers/notifications';
import {pullRequestsModel} from '../../models/pullRequestsModel';
import {LoginDetails, userModel} from '../../models/userModel';
import {commitToPRs} from '../../utils/commit-to-prs';
import {performAutomerge} from '../../utils/perform-automerge';

import {StatusHook} from './types';

async function handleFailingStatus(
    loginDetails: LoginDetails,
    hookData: StatusHook): Promise<WebHookHandleResponse> {
  const webhookResponse: WebHookHandleResponse = {
    handled: false,
    notifications: null,
  };

  const allPRDetails =
      await commitToPRs(loginDetails.githubToken, hookData.name, hookData.sha);
  for (const prDetails of allPRDetails) {
    if (!prDetails.commit) {
      continue;
    }

    if (prDetails.commit.oid === hookData.sha) {
      const commitDetails = await pullRequestsModel.getCommitDetails(
          prDetails.id,
          prDetails.commit.oid,
      );

      if (!commitDetails || commitDetails.status !== hookData.state) {
        webhookResponse.handled = true;

        await pullRequestsModel.setCommitStatus(
            prDetails.id,
            prDetails.commit.oid,
            hookData.state,
        );

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
    }
  }

  return webhookResponse;
}

async function handleSuccessStatus(
    loginDetails: LoginDetails,
    hookData: StatusHook): Promise<WebHookHandleResponse> {
  const webhookResponse: WebHookHandleResponse = {
    handled: false,
    notifications: null,
  };

  const allPRDetails =
      await commitToPRs(loginDetails.githubToken, hookData.name, hookData.sha);
  for (const prDetails of allPRDetails) {
    // If all commits state is success (all status checks passed) or
    if (prDetails.commit.state !== 'SUCCESS' &&
        prDetails.commit.state !== null) {
      continue;
    }

    webhookResponse.handled = true;

    try {
      await performAutomerge(
          loginDetails.githubToken, hookData.name, prDetails);
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
  }

  return webhookResponse;
}

// Triggered when the status of a Git commit changes.
export async function handleStatus(hookData: StatusHook):
    Promise<WebHookHandleResponse> {
  const author = hookData.commit.author;
  const loginDetails = await userModel.getLoginDetails(author.login);
  if (!loginDetails) {
    // Commit author isn't logged in so not token to figure out
    // appropriate PR's affect by this commit status
    return {
      handled: false,
      notifications: null,
    };
  }

  if (hookData.state === 'error' || hookData.state === 'failure') {
    return handleFailingStatus(loginDetails, hookData);
  } else if (hookData.state === 'success') {
    return handleSuccessStatus(loginDetails, hookData);
  }
  return {handled: false, notifications: null};
}
