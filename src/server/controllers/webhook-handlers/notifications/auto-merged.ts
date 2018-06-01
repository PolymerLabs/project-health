import * as webhooks from '../../../../types/webhooks';
import {getPRTag, sendNotification} from '../../../controllers/notifications';
import {pullRequestsModel} from '../../../models/pullRequestsModel';
import {generateGithubAppToken} from '../../../utils/generate-github-app-token';
import {getPRDetailsFromCommit, PullRequestDetails} from '../../../utils/get-pr-from-commit';
import {performAutomerge} from '../../../utils/perform-automerge';
import {WebhookListener, WebhookListenerResponse, webhooksController} from '../../github-app-webhooks';

/**
 * This handles the status event payload and performs requested auto merges.
 * Upon attempt of an auto merge, notify the pull request author of the result.
 */
export class AutoMergedNotification implements WebhookListener {
  static ID = 'auto-merged-notification';

  async handleWebhookEvent(payload: webhooks.WebhookPayload):
      Promise<WebhookListenerResponse|null> {
    if (payload.type !== 'status') {
      return null;
    }

    // Do not perform auto merges for non installation payloads.
    if (!payload.installation) {
      return null;
    }

    // Generate an app token to use for the auto merging. The user token for the
    // author may not have the necessary permissions.
    const token = await generateGithubAppToken(payload.installation.id);
    if (!token) {
      return null;
    }

    // Fetch info about the associated pull request.
    const prDetails =
        await getPRDetailsFromCommit(token, payload.name, payload.sha);
    if (!prDetails) {
      return null;
    }

    // Status is failing. Saving of commit status is handled in failing status
    // notification.
    if (payload.state === 'error' || payload.state === 'failure') {
      return null;
    }

    this.saveCommitStatus(prDetails, payload);

    // If the PR is not open, don't process the event.
    if (prDetails.state !== 'OPEN') {
      return null;
    }

    // If the hooks SHA is not the latest commit in the PR, don't process the
    // event.
    if (prDetails.commit.oid !== payload.sha) {
      return null;
    }

    // Check if the latest commits status checks have passed
    if (prDetails.commit.state !== 'SUCCESS' &&
        prDetails.commit.state !== null) {
      return null;
    }

    const automergeOpts = await pullRequestsModel.getAutomergeOpts(
        prDetails.owner, prDetails.repo, prDetails.number);
    // Check auto merge is configured.
    if (!automergeOpts || !automergeOpts.mergeType ||
        automergeOpts.mergeType === 'manual') {
      return null;
    }

    let notificationTitle = null;
    let icon = '/images/notification-images/icon-completed-192x192.png';
    try {
      await performAutomerge(token, prDetails, automergeOpts.mergeType);
      notificationTitle = `Automerge complete for '${prDetails.title}'`;
      icon = '/images/notification-images/icon-completed-192x192.png';
    } catch (err) {
      // Githubs response will have a slightly more helpful message
      // under err.error.message.
      let msg = err.message;
      if (err.error && err.error.message) {
        msg = err.error.message;
      }

      notificationTitle = `Automerge failed for '${prDetails.title}'`;
      icon = '/images/notification-images/icon-error-192x192.png';

      // TODO: Log this to stackdriver.
      console.error(`Unable to perform automerge: '${msg}'`);
    }

    const results = await sendNotification(prDetails.author, {
      title: notificationTitle,
      body: `[${prDetails.repo}] ${prDetails.title}`,
      requireInteraction: false,
      icon,
      data: {
        url: prDetails.url,
        pullRequest: {
          gqlId: prDetails.gqlId,
        },
      },
      tag: getPRTag(prDetails.owner, prDetails.repo, prDetails.number),
    });

    return {
      id: AutoMergedNotification.ID,
      notifications: [results],
    };
  }

  private async saveCommitStatus(
      prDetails: PullRequestDetails,
      payload: webhooks.StatusPayload) {
    await pullRequestsModel.setCommitStatus(
        prDetails.owner,
        prDetails.repo,
        prDetails.number,
        prDetails.commit.oid,
        payload.state,
    );
  }
}

webhooksController.addListener('status', new AutoMergedNotification());
