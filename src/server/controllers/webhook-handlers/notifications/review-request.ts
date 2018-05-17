import * as webhooks from '../../../../types/webhooks';
import {userModel} from '../../../models/userModel';
import {generateGithubAppToken} from '../../../utils/generate-github-app-token';
import {getPRID} from '../../../utils/get-gql-pr-id';
import {WebhookListener, WebhookListenerResponse, webhooksController} from '../../github-app-webhooks';
import {getPRTag, sendNotification} from '../../notifications';

/**
 * Sends notification to the reviewer that a review has been requested. GitHub
 * sends a separate payload for each requested reviewer.
 */
export class ReviewRequestedNotification implements WebhookListener {
  static ID = 'review-requested-notification';

  async handleWebhookEvent(payload: webhooks.WebhookPayload):
      Promise<WebhookListenerResponse|null> {
    if (payload.type !== 'pull_request') {
      return null;
    }

    if (payload.action !== 'review_requested') {
      return null;
    }

    // If one of the reviewers requires a notification, we should be able to
    // find a token to use.
    const token = await this.getToken(payload);
    if (!token) {
      return null;
    }

    const prGqlId = await getPRID(
        token,
        payload.repository.owner.login,
        payload.repository.name,
        payload.pull_request.number);

    if (!prGqlId) {
      return null;
    }

    const notification = {
      title: `${payload.pull_request.user.login} requested a review`,
      body: `[${payload.repository.name}] ${payload.pull_request.title}`,
      requireInteraction: true,
      data: {
        url: payload.pull_request.html_url,
        pullRequest: {
          gqlId: prGqlId,
        },
      },
      tag: getPRTag(
          payload.repository.owner.login,
          payload.repository.name,
          payload.pull_request.number),
    };

    // Send a notification to each requested reviewer.
    const notificationStats = [];
    notificationStats.push(
        await sendNotification(payload.requested_reviewer.login, notification));

    return {
      id: ReviewRequestedNotification.ID,
      notifications: notificationStats
    };
  }

  // Fetches a token to use for this payload. First, for app webhook events,
  // generate an appropriate token. Otherwise, try and use the pull request
  // author's token. Finally try finding a token from the reviewers list.
  private async getToken(payload: webhooks.PullRequestReviewRequestedPayload):
      Promise<string|null> {
    if (payload.installation) {
      return await generateGithubAppToken(payload.installation.id);
    }

    let userRecord =
        await userModel.getUserRecord(payload.pull_request.user.login);
    if (userRecord) {
      return userRecord.githubToken;
    }

    userRecord =
        await userModel.getUserRecord(payload.requested_reviewer.login);
    if (userRecord) {
      return userRecord.githubToken;
    }

    return null;
  }
}

webhooksController.addListener(
    'pull_request', new ReviewRequestedNotification());
