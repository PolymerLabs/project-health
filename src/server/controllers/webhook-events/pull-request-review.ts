import {WebHookHandleResponse} from '../../apis/github-webhook';
import {getPRTag, sendNotification} from '../../controllers/notifications';
import {userModel} from '../../models/userModel';
import {getPRID} from '../../utils/get-gql-pr-id';

import {PullRequestReviewHook} from './types';

export async function handlePullRequestReview(hookData: PullRequestReviewHook):
    Promise<WebHookHandleResponse> {
  if (hookData.action !== 'submitted') {
    return {
      handled: false,
      notifications: null,
      message:
          `The PR review action is not a handled action: '${hookData.action}'`
    };
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

  const loginDetails = await userModel.getLoginDetails(pullReq.user.login);
  if (!loginDetails) {
    return {
      handled: false,
      notifications: null,
      message: 'Unable to find login details to retrieve PR ID'
    };
  }

  const prGqlId = await getPRID(
      loginDetails.githubToken, repo.owner.login, repo.name, pullReq.number);

  if (!prGqlId) {
    return {
      handled: false,
      notifications: null,
      message: 'Unable to retrieve the PR ID'
    };
  }

  let notificationStats = null;
  if (notificationTitle) {
    notificationStats = await sendNotification(pullReq.user.login, {
      title: notificationTitle,
      body: `[${repo.name}] ${pullReq.title}`,
      requireInteraction: true,
      data: {
        url: pullReq.html_url,
        pullRequest: {
          gqlId: prGqlId,
        },
      },
      tag: getPRTag(repo.owner.login, repo.name, pullReq.number),
    });
  }

  return {handled: true, notifications: notificationStats, message: null};
}
