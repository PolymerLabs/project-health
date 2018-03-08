import {WebHookHandleResponse} from '../../apis/github-webhook';
import {sendNotification} from '../../controllers/notifications';
import {userModel} from '../../models/userModel';
import {PullRequestReviewHook} from './types';

export async function handlePullRequestReview(hookData: PullRequestReviewHook):
    Promise<WebHookHandleResponse> {
  if (hookData.action !== 'submitted') {
    return {handled: false, notifications: null};
  }

  const review = hookData.review;
  const repo = hookData.repository;
  const pullReq = hookData.pull_request;

  let notificationTitle = null;

  // The author of the review should change to no longer having any action.
  await userModel.markUserForUpdate(review.user.login);
  // The PR owner should update with latest info.
  await userModel.markUserForUpdate(pullReq.user.login);

  if (review.state === 'approved') {
    notificationTitle = `${review.user.login} approved your PR`;
  } else if (review.state === 'changes_requested') {
    notificationTitle = `${review.user.login} requested changes`;
  } else if (review.state === 'commented') {
    // Check if the PR author is the commenter
    if (review.user.login !== pullReq.user.login) {
      notificationTitle = `${review.user.login} commented on your PR`;
    }
  }

  let notificationStats = null;
  if (notificationTitle) {
    notificationStats = await sendNotification(pullReq.user.login, {
      title: notificationTitle,
      body: `[${repo.name}] ${pullReq.title}`,
      requireInteraction: true,
      icon: '/images/notification-images/icon-192x192.png',
      data: {
        url: pullReq.html_url,
      },
    });
  }

  return {handled: true, notifications: notificationStats};
}
