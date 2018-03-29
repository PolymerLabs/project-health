import {WebHookHandleResponse} from '../../apis/github-webhook';
import {getPRTag, sendNotification} from '../../controllers/notifications';
import {userModel} from '../../models/userModel';
import {getPRID} from '../../utils/get-gql-pr-id';
import {getPRDetailsFromCommit} from '../../utils/get-pr-from-commit';

import {PullRequestReviewHook} from './types';

export async function handlePullRequestReview(hookData: PullRequestReviewHook):
    Promise<WebHookHandleResponse> {
  const webhookResponse: WebHookHandleResponse = {
    handled: false,
    notifications: null,
    message: null,
  };
  if (hookData.action !== 'submitted') {
    webhookResponse.message =
        `The PR review action is not a handled action: '${hookData.action}'`;
    return webhookResponse;
  }

  const review = hookData.review;
  const repo = hookData.repository;
  const pullReq = hookData.pull_request;

  const userRecord = await userModel.getUserRecord(pullReq.user.login);
  if (!userRecord) {
    webhookResponse.message = 'Unable to find login details to retrieve PR ID';
    return webhookResponse;
  }

  let notificationTitle = null;

  // The author of the review should change to no longer having any action.
  await userModel.markUserForUpdate(review.user.login);
  // The PR owner should update with latest info.
  await userModel.markUserForUpdate(pullReq.user.login);

  if (review.state === 'approved') {
    // Either send ready to merge OR send approved notification
    const prDetails = await getPRDetailsFromCommit(
        userRecord.githubToken, repo.full_name, hookData.review.commit_id);
    if (prDetails && prDetails.commit.state === 'SUCCESS') {
      webhookResponse.message =
          'Sending approved and ready to merge notification';
      notificationTitle = `${review.user.login} approved - ready to merge`;
    } else {
      webhookResponse.message =
          'Sending approved but not ready to merge notification';
      notificationTitle = `${review.user.login} approved your PR`;
    }
  } else if (review.state === 'changes_requested') {
    webhookResponse.message = 'Sending changes requested notification';
    notificationTitle = `${review.user.login} requested changes`;
  } else if (review.state === 'commented') {
    // Check if the PR author is the commenter
    if (review.user.login !== pullReq.user.login) {
      webhookResponse.message = 'Sending comment notification';
      notificationTitle = `${review.user.login} commented on your PR`;
    } else {
      webhookResponse.message =
          'Author of PR is author of comment so doing nothing';
      return webhookResponse;
    }
  } else {
    webhookResponse.message =
        `Unsupported review state received: \'${review.state}\'`;
    return webhookResponse;
  }

  const prGqlId = await getPRID(
      userRecord.githubToken, repo.owner.login, repo.name, pullReq.number);

  if (!prGqlId) {
    webhookResponse.message = 'Unable to retrieve the PR ID';
    return webhookResponse;
  }

  const results = await sendNotification(pullReq.user.login, {
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
  webhookResponse.notifications = results;

  webhookResponse.handled = true;
  return webhookResponse;
}
