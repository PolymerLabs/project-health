import {WebHookHandleResponse} from '../../apis/github-webhook';
import {sendNotification} from '../../controllers/notifications';
import {userModel} from '../../models/userModel';
import {PullRequestHook} from './types';

export async function handlePullRequest(hookBody: PullRequestHook):
    Promise<WebHookHandleResponse> {
  if (hookBody.action !== 'review_requested') {
    return {handled: false, notifications: null};
  }

  const pullRequest = hookBody.pull_request;
  const repo = hookBody.repository;
  const user = pullRequest.user;
  const reviewer = hookBody.requested_reviewer;

  // The reviewer's dash will have a new entry under incoming
  await userModel.markUserForUpdate(reviewer.login);
  // The PR owner's dash should update with an incoming entry
  await userModel.markUserForUpdate(user.login);

  const notification = {
    title: `${user.login} requested a review`,
    body: `[${repo.name}] ${pullRequest.title}`,
    requireInteraction: true,
    icon: '/images/notification-images/icon-192x192.png',
    data: {
      url: pullRequest.html_url,
    }
  };

  const notificationStats =
      await sendNotification(reviewer.login, notification);

  return {handled: true, notifications: notificationStats};
}
