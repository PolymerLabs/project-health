import * as webhooks from '../../../../types/webhooks';
import {userModel} from '../../../models/userModel';
import {generateGithubAppToken} from '../../../utils/generate-github-app-token';
import {getPRID} from '../../../utils/get-gql-pr-id';
import {getPRDetailsFromCommit} from '../../../utils/get-pr-from-commit';
import {WebhookListener, WebhookListenerResponse, webhooksController} from '../../github-app-webhooks';
import {getPRTag, sendNotification} from '../../notifications';

/**
 * Sends notifications to the PR author when a review is submitted. It also
 * marks the PR author and review as requiring updates.
 */
export class ReviewUpdater implements WebhookListener {
  static ID = 'pull-request-review-notifications';

  async handleWebhookEvent(payload: webhooks.WebhookPayload):
      Promise<WebhookListenerResponse|null> {
    if (payload.type !== 'pull_request_review') {
      return null;
    }

    if (payload.action !== 'submitted') {
      return null;
    }

    const response: WebhookListenerResponse = {
      id: ReviewUpdater.ID,
      notifications: [],
    };

    // The author of the review should change to no longer having any action.
    await userModel.markUserForUpdate(payload.review.user.login);
    // The PR owner should update with latest info.
    await userModel.markUserForUpdate(payload.pull_request.user.login);

    const token = await this.getToken(payload);
    // TODO: a token shouldn't be required to generate notifications.
    if (!token) {
      return response;
    }

    let notificationTitle = null;
    const review = payload.review;
    const reviewer = payload.review.user.login;

    if (review.state === 'approved') {
      // Either send ready to merge OR send approved notification.
      const prDetails = await getPRDetailsFromCommit(
          token, payload.repository.full_name, review.commit_id);
      if (prDetails && prDetails.commit.state === 'SUCCESS') {
        notificationTitle = `${reviewer} approved - ready to merge`;
      } else {
        notificationTitle = `${reviewer} approved your PR`;
      }
    } else if (review.state === 'changes_requested') {
      notificationTitle = `${reviewer} requested changes`;
    } else if (review.state === 'commented') {
      // Check if the PR author is the commenter.
      if (reviewer !== payload.pull_request.user.login) {
        notificationTitle = `${reviewer} commented on your PR`;
      }
    }

    // No notification to send. For example the review state might be dismissed.
    if (!notificationTitle) {
      return response;
    }

    const prGqlId = await getPRID(
        token,
        payload.repository.owner.login,
        payload.repository.name,
        payload.pull_request.number);

    if (!prGqlId) {
      return response;
    }

    const result = await sendNotification(payload.pull_request.user.login, {
      title: notificationTitle,
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
    });

    response.notifications.push(result);

    return response;
  }

  // Fetches a token to use for this payload. First, for app webhook events,
  // generate an appropriate token. Otherwise, try and use the pull request
  // author's token.
  private async getToken(payload: webhooks.PullRequestReviewPayload):
      Promise<string|null> {
    if (payload.installation) {
      return await generateGithubAppToken(payload.installation.id);
    }

    const userRecord =
        await userModel.getUserRecord(payload.pull_request.user.login);
    if (!userRecord) {
      return null;
    }

    return userRecord.githubToken;
  }
}

webhooksController.addListener('pull_request', new ReviewUpdater());
