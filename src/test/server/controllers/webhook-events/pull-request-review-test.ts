import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';
import * as sinon from 'sinon';
import {SinonSandbox, SinonStub} from 'sinon';

import {startTestReplayServer} from '../../../../replay-server';
import * as notificationController from '../../../../server/controllers/notifications';
import {handlePullRequestReview} from '../../../../server/controllers/webhook-events/pull-request-review';
import {PullRequestReviewHook} from '../../../../server/controllers/webhook-events/types';
import {userModel} from '../../../../server/models/userModel';
import * as getPRIDUtils from '../../../../server/utils/get-gql-pr-id';
import * as getPRFromCommitModule from '../../../../server/utils/get-pr-from-commit';
import {PullRequestDetails} from '../../../../server/utils/get-pr-from-commit';
import {initFirestore} from '../../../../utils/firestore';
import {initGithub} from '../../../../utils/github';
import {initSecrets} from '../../../../utils/secrets';

const TEST_SECRETS = {
  GITHUB_CLIENT_ID: 'ClientID',
  GITHUB_CLIENT_SECRET: 'ClientSecret',
  PUBLIC_VAPID_KEY:
      'BPtJjYprRvU3TOb0tw3FrVbLww3bp7ssGjX99PFlqIOb3b8uOH4_Q21GYhwsDRwcfToaFVVeOxWOq5XaXD1MGdw',
  PRIVATE_VAPID_KEY: 'o1P9aXm-QPZezF_8b7aQabivhv3QqaB0yg5zoFs6-qc',
};

const FAKE_LOGIN_DETAILS = {
  githubToken: 'injected-fake-token',
  username: 'test-username',
  scopes: null,
};

function newFakeHookDetails(extraDetails: {}) {
  const HOOK_DATA: PullRequestReviewHook = {
    action: 'unexpected',
    review: {
      state: 'unexpected',
      user: {
        login: 'test-review-author',
      },
      commit_id: '1234',
    },
    pull_request: {
      number: 1,
      title: 'test PR title',
      user: {
        login: 'test-pr-author',
      },
      html_url: 'http://example.com/pr/1',
    },
    repository: {
      name: 'test-repo',
      owner: {
        login: 'test-owner',
      },
      full_name: 'test-owner/test-repo',
    }
  };

  return Object.assign({}, HOOK_DATA, extraDetails);
}

function newFakePRDetails(extraDetails: {}) {
  const PR_DETAILS: PullRequestDetails = {
    gqlId: 'test-pr-id',
    number: 1,
    title: 'test-title',
    body: 'test-body',
    url: 'http://test-url.com',
    owner: 'test-owner',
    repo: 'test-repo',
    author: 'test-pr-author',
    state: 'OPEN',
    commit: {
      oid: 'test-commit-SHA',
      state: 'PENDING',
    }
  };

  return Object.assign({}, PR_DETAILS, extraDetails);
}

type TestContext = {
  server: Server,
  sandbox: SinonSandbox
};
const test = anyTest as TestInterface<TestContext>;

let sendStub: SinonStub;

test.before(() => {
  initFirestore();
  initSecrets(TEST_SECRETS);
});

test.beforeEach(async (t) => {
  const {server, url} = await startTestReplayServer(t);
  t.context.server = server;
  t.context.sandbox = sinon.sandbox.create();
  initGithub(url, url);

  sendStub = t.context.sandbox.stub(notificationController, 'sendNotification');
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
  await new Promise((resolve) => t.context.server.close(resolve));
});

test.serial(
    '[handlePullRequestReview]: should not handle a non-submitted hook',
    async (t) => {
      const response = await handlePullRequestReview(newFakeHookDetails({}));
      t.deepEqual(
          response.message,
          'The PR review action is not a handled action: \'unexpected\'');
      t.deepEqual(response.handled, false, 'webhook should not be handled.');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handlePullRequestReview]: should handle lack of login details',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return null;
      });

      const response = await handlePullRequestReview(
          newFakeHookDetails({action: 'submitted'}));
      t.deepEqual(
          response.message, 'Unable to find login details to retrieve PR ID');
      t.deepEqual(response.handled, false, 'webhook should not be handled.');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handlePullRequestReview]: should handle an unsupported review state',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      const response = await handlePullRequestReview(
          newFakeHookDetails({action: 'submitted'}));
      t.deepEqual(
          response.message,
          'Unsupported review state received: \'unexpected\'');
      t.deepEqual(response.handled, false, 'webhook should not be handled.');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handlePullRequestReview]: should handle a failure to get the pull requests GraphQL ID',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRIDUtils, 'getPRID').callsFake(() => {
        return null;
      });

      const hookData = newFakeHookDetails({action: 'submitted'});
      hookData.review.state = 'changes_requested';
      const response = await handlePullRequestReview(hookData);
      t.deepEqual(response.message, 'Unable to retrieve the PR ID');
      t.deepEqual(response.handled, false, 'webhook should not be handled.');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handlePullRequestReview]: should send a notification when changes are requested',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRIDUtils, 'getPRID').callsFake(() => {
        return 'test-gql-pr-id';
      });

      const hookData = newFakeHookDetails({action: 'submitted'});
      hookData.review.state = 'changes_requested';
      const response = await handlePullRequestReview(hookData);
      t.deepEqual(response.message, 'Sending changes requested notification');
      t.deepEqual(response.handled, true, 'webhook should be handled.');
      t.deepEqual(sendStub.callCount, 1, 'sendNotification should be called');
      t.deepEqual(
          sendStub.args[0][0], 'test-pr-author', 'Notification receiver');
      t.deepEqual(
          sendStub.args[0][1],
          {
            title: 'test-review-author requested changes',
            body: '[test-repo] test PR title',
            data: {
              pullRequest: {
                gqlId: 'test-gql-pr-id',
              },
              url: 'http://example.com/pr/1',
            },
            requireInteraction: true,
            tag: 'pr-test-owner/test-repo/1',
          },
          'Notification options');
    });

test.serial(
    '[handlePullRequestReview]: should send a notification when reviewer comments',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRIDUtils, 'getPRID').callsFake(() => {
        return 'test-gql-pr-id';
      });

      const hookData = newFakeHookDetails({action: 'submitted'});
      hookData.review.state = 'commented';
      const response = await handlePullRequestReview(hookData);
      t.deepEqual(response.message, 'Sending comment notification');
      t.deepEqual(response.handled, true, 'webhook should be handled.');
      t.deepEqual(sendStub.callCount, 1, 'sendNotification should be called');
      t.deepEqual(
          sendStub.args[0][0], 'test-pr-author', 'Notification receiver');
      t.deepEqual(
          sendStub.args[0][1],
          {
            title: 'test-review-author commented on your PR',
            body: '[test-repo] test PR title',
            data: {
              pullRequest: {
                gqlId: 'test-gql-pr-id',
              },
              url: 'http://example.com/pr/1',
            },
            requireInteraction: true,
            tag: 'pr-test-owner/test-repo/1',
          },
          'Notification options');
    });

test.serial(
    '[handlePullRequestReview]: should *not* send a notification when reviewer comment is the author of the PR',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRIDUtils, 'getPRID').callsFake(() => {
        return 'test-gql-pr-id';
      });

      const hookData = newFakeHookDetails({action: 'submitted'});
      hookData.review.state = 'commented';
      hookData.review.user.login = hookData.pull_request.user.login;

      const response = await handlePullRequestReview(hookData);
      t.deepEqual(
          response.message,
          'Author of PR is author of comment so doing nothing');
      t.deepEqual(response.handled, false, 'webhook should be handled.');
      t.deepEqual(sendStub.callCount, 0, 'sendNotification should be called');
    });

test.serial(
    '[handlePullRequestReview]: should send a notification for PR approval if no PR details from commit',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRIDUtils, 'getPRID').callsFake(() => {
        return 'test-gql-pr-id';
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return null;
          });

      const hookData = newFakeHookDetails({action: 'submitted'});
      hookData.review.state = 'approved';

      const response = await handlePullRequestReview(hookData);
      t.deepEqual(
          response.message,
          'Sending approved but not ready to merge notification');
      t.deepEqual(response.handled, true, 'webhook should be handled.');
      t.deepEqual(sendStub.callCount, 1, 'sendNotification should be called');
      t.deepEqual(
          sendStub.args[0][0], 'test-pr-author', 'Notification receiver');
      t.deepEqual(
          sendStub.args[0][1],
          {
            title: 'test-review-author approved your PR',
            body: '[test-repo] test PR title',
            data: {
              pullRequest: {
                gqlId: 'test-gql-pr-id',
              },
              url: 'http://example.com/pr/1',
            },
            requireInteraction: true,
            tag: 'pr-test-owner/test-repo/1',
          },
          'Notification options');
    });

test.serial(
    '[handlePullRequestReview]: should send a notification for PR approval with non-success state for commit',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRIDUtils, 'getPRID').callsFake(() => {
        return 'test-gql-pr-id';
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return newFakePRDetails({});
          });

      const hookData = newFakeHookDetails({action: 'submitted'});
      hookData.review.state = 'approved';

      const response = await handlePullRequestReview(hookData);
      t.deepEqual(
          response.message,
          'Sending approved but not ready to merge notification');
      t.deepEqual(response.handled, true, 'webhook should be handled.');
      t.deepEqual(sendStub.callCount, 1, 'sendNotification should be called');
      t.deepEqual(
          sendStub.args[0][0], 'test-pr-author', 'Notification receiver');
      t.deepEqual(
          sendStub.args[0][1],
          {
            title: 'test-review-author approved your PR',
            body: '[test-repo] test PR title',
            data: {
              pullRequest: {
                gqlId: 'test-gql-pr-id',
              },
              url: 'http://example.com/pr/1',
            },
            requireInteraction: true,
            tag: 'pr-test-owner/test-repo/1',
          },
          'Notification options');
    });

test.serial(
    '[handlePullRequestReview]: should send a notification for PR approval with ready to merge',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRIDUtils, 'getPRID').callsFake(() => {
        return 'test-gql-pr-id';
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            const details = newFakePRDetails({});
            details.commit.state = 'SUCCESS';
            return details;
          });

      const hookData = newFakeHookDetails({action: 'submitted'});
      hookData.review.state = 'approved';

      const response = await handlePullRequestReview(hookData);
      t.deepEqual(
          response.message, 'Sending approved and ready to merge notification');
      t.deepEqual(response.handled, true, 'webhook should be handled.');
      t.deepEqual(sendStub.callCount, 1, 'sendNotification should be called');
      t.deepEqual(
          sendStub.args[0][0], 'test-pr-author', 'Notification receiver');
      t.deepEqual(
          sendStub.args[0][1],
          {
            title: 'test-review-author approved - ready to merge',
            body: '[test-repo] test PR title',
            data: {
              pullRequest: {
                gqlId: 'test-gql-pr-id',
              },
              url: 'http://example.com/pr/1',
            },
            requireInteraction: true,
            tag: 'pr-test-owner/test-repo/1',
          },
          'Notification options');
    });
