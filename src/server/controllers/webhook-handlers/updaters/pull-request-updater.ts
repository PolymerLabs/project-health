import * as webhooks from '../../../../types/webhooks';
import {pullRequestsModel} from '../../../models/pullRequestsModel';
import {userModel} from '../../../models/userModel';
import {WebhookListener, WebhookListenerResponse, webhooksController} from '../../github-app-webhooks';

/**
 * Makes necessary updates for pull request events.
 */
export class PullRequestUpdater implements WebhookListener {
  static ID = 'pull-request-updater';

  async handleWebhookEvent(payload: webhooks.WebhookPayload):
      Promise<WebhookListenerResponse|null> {
    if (payload.type !== 'pull_request') {
      return null;
    }

    if (payload.action === 'review_requested') {
      // Mark requested reviewer as requiring an update.
      await userModel.markUserForUpdate(payload.requested_reviewer.login);
      // Mark the PR author as requiring an update.
      await userModel.markUserForUpdate(payload.pull_request.user.login);
    }

    if (payload.action === 'opened') {
      await pullRequestsModel.pullRequestOpened(
          payload.repository.owner.login,
          payload.repository.name,
          payload.pull_request.number);
    }

    if (payload.action === 'closed') {
      // Mark the PR author as requiring an update.
      await userModel.markUserForUpdate(payload.pull_request.user.login);

      await pullRequestsModel.deletePR(
          payload.repository.owner.login,
          payload.repository.name,
          payload.pull_request.number);
    }


    return {id: PullRequestUpdater.ID, notifications: []};
  }
}

webhooksController.addListener('pull_request', new PullRequestUpdater());
