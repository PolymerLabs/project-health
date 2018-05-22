import * as webhooks from '../../../../types/webhooks';
import {pullRequestsModel} from '../../../models/pullRequestsModel';
import {userModel} from '../../../models/userModel';
import {getPRDetailsFromCommit} from '../../../utils/get-pr-from-commit';
import {WebhookListener, WebhookListenerResponse} from '../../github-app-webhooks';
import {getPRTag, sendNotification} from '../../notifications';

export class FailingStatusChecksNotification implements WebhookListener {
  static ID = 'failing-status-checks-notification';

  async handleWebhookEvent(payload: webhooks.WebhookPayload):
      Promise<WebhookListenerResponse|null> {
    if (payload.type !== 'status') {
      return null;
    }

    const token = await this.getToken(payload);
    if (!token) {
      return null;
    }

    // Fetch info about the associated pull request.
    const prDetails =
        await getPRDetailsFromCommit(token, payload.name, payload.sha);
    if (!prDetails) {
      return null;
    }

    // Status is not failing.
    if (payload.state !== 'error' && payload.state !== 'failure') {
      return null;
    }

    // Get previous state. If another handler of the same payload saves before
    // this hook, this will prevent this notification from correctly sending.
    const savedCommitDetails = await pullRequestsModel.getCommitDetails(
        prDetails.owner,
        prDetails.repo,
        prDetails.number,
        prDetails.commit.oid,
    );

    // Save commit status.
    await pullRequestsModel.setCommitStatus(
        prDetails.owner,
        prDetails.repo,
        prDetails.number,
        prDetails.commit.oid,
        payload.state,
    );

    // Previous commit details and the payload details are for the same state.
    if (savedCommitDetails && savedCommitDetails.status === payload.state) {
      return null;
    }

    const results = await sendNotification(prDetails.author, {
      title: payload.description || 'Status checks failed',
      body: `[${payload.repository.name}] ${prDetails.title}`,
      requireInteraction: false,
      icon: '/images/notification-images/icon-error-192x192.png',
      data: {
        url: prDetails.url,
        pullRequest: {
          gqlId: prDetails.gqlId,
        },
      },
      tag: getPRTag(
          payload.repository.owner.login,
          payload.repository.name,
          prDetails.number),
    });

    return {
      id: FailingStatusChecksNotification.ID,
      notifications: [results],
    };
  }

  /**
   * Fetches the token for the given status payload. As we're trying to send a
   * notification to the author of the PR, fetch the token associated with the
   * pull request author.
   */
  private async getToken(payload: webhooks.StatusPayload) {
    const userRecord =
        await userModel.getUserRecord(payload.commit.author.login);
    if (!userRecord) {
      return null;
    }
    return userRecord.githubToken;
  }
}
