import {WebHookHandleResponse} from '../../apis/github-webhook';
import {getPRTag, sendNotification} from '../../controllers/notifications';
import {pullRequestsModel} from '../../models/pullRequestsModel';
import {userModel} from '../../models/userModel';
import {getPRID} from '../../utils/get-gql-pr-id';

import {PullRequestHook} from './types';

async function handleReviewRequested(hookBody: PullRequestHook):
    Promise<WebHookHandleResponse> {
  const pullRequest = hookBody.pull_request;
  const repo = hookBody.repository;
  const user = pullRequest.user;
  const reviewer = hookBody.requested_reviewer;

  // The reviewer's dash will have a new entry under incoming
  await userModel.markUserForUpdate(reviewer.login);
  // The PR owner's dash should update with an incoming entry
  await userModel.markUserForUpdate(user.login);

  const loginDetails = await userModel.getLoginDetails(user.login);
  if (!loginDetails) {
    return {
      handled: false,
      notifications: null,
      message: 'Unable to find login details to retrieve PR ID'
    };
  }

  const prGqlId = await getPRID(
      loginDetails.githubToken,
      repo.owner.login,
      repo.name,
      pullRequest.number);

  if (!prGqlId) {
    return {
      handled: false,
      notifications: null,
      message: 'Unable to retrieve the PR ID'
    };
  }

  const notification = {
    title: `${user.login} requested a review`,
    body: `[${repo.name}] ${pullRequest.title}`,
    requireInteraction: true,
    data: {
      url: pullRequest.html_url,
      pullRequest: {
        gqlId: prGqlId,
      },
    },
    tag: getPRTag(repo.owner.login, repo.name, pullRequest.number),
  };

  const notificationStats =
      await sendNotification(reviewer.login, notification);

  return {handled: true, notifications: notificationStats, message: null};
}

async function handlePROpened(hookBody: PullRequestHook):
    Promise<WebHookHandleResponse> {
  const owner = hookBody.repository.owner.login;
  const repo = hookBody.repository.name;
  const num = hookBody.pull_request.number;
  await pullRequestsModel.pullRequestOpened(owner, repo, num);
  return {handled: true, notifications: null, message: null};
}

async function handlePRClosed(hookBody: PullRequestHook) {
  const owner = hookBody.repository.owner.login;
  const repo = hookBody.repository.name;
  const num = hookBody.pull_request.number;
  await pullRequestsModel.deletePR(owner, repo, num);
  return {handled: true, notifications: null, message: null};
}

export async function handlePullRequest(hookBody: PullRequestHook):
    Promise<WebHookHandleResponse> {
  if (hookBody.action === 'review_requested') {
    return handleReviewRequested(hookBody);
  } else if (hookBody.action === 'opened') {
    return handlePROpened(hookBody);
  } else if (hookBody.action === 'closed') {
    return handlePRClosed(hookBody);
  }

  return {
    handled: false,
    notifications: null,
    message: `The PR action is not a handled action: '${hookBody.action}'`
  };
}
