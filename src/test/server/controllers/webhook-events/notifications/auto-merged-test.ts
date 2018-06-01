import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';
import * as sinon from 'sinon';
import {SinonSandbox, SinonStub} from 'sinon';

import * as notificationController from '../../../../../server/controllers/notifications';
import {AutoMergedNotification} from '../../../../../server/controllers/webhook-handlers/notifications/auto-merged';
import {pullRequestsModel} from '../../../../../server/models/pullRequestsModel';
import {userModel} from '../../../../../server/models/userModel';
import * as genTokenUtils from '../../../../../server/utils/generate-github-app-token';
import * as getPRFromCommitModule from '../../../../../server/utils/get-pr-from-commit';
import * as performAutomergeModule from '../../../../../server/utils/perform-automerge';
import {StatusPayload} from '../../../../../types/webhooks';
import {initFirestore} from '../../../../../utils/firestore';
import {initGithub} from '../../../../../utils/github';
import {initSecrets} from '../../../../../utils/secrets';
import {newFakePullRequestDetails} from '../../../../utils/newFakePRDetails';
import {newFakeSecrets} from '../../../../utils/newFakeSecrets';
import {newFakeUserRecord} from '../../../../utils/newFakeUserRecord';
import {startTestReplayServer} from '../../../../utils/replay-server';

function payload(state: 'error'|'failure'|'pending'|'success'): StatusPayload {
  return {
    type: 'status',
    sha: 'test-commit-SHA',
    name: 'test-owner/test-repo',
    state,
    description: '',
    target_url: null,
    branches: [],
    repository: {
      name: 'test-repo',
      owner: {
        login: 'owner-login',
      },
      full_name: 'owner-login/test-repo',
    },
    commit: {
      author: {
        login: 'commit-author',
      },
      sha: 'commit-SHA'
    },
    installation: {id: 123},
  };
}

type TestContext = {
  server: Server,
  sandbox: SinonSandbox
};
const test = anyTest as TestInterface<TestContext>;

let sendStub: SinonStub;
let performAutomergeStub: SinonStub;

test.before(() => {
  initFirestore();
  initSecrets(newFakeSecrets());
});

test.beforeEach(async (t) => {
  const {server, url} = await startTestReplayServer(t);
  t.context.server = server;
  t.context.sandbox = sinon.sandbox.create();
  initGithub(url, url);

  sendStub = t.context.sandbox.stub(notificationController, 'sendNotification');
  performAutomergeStub =
      t.context.sandbox.stub(performAutomergeModule, 'performAutomerge');

  t.context.sandbox.stub(genTokenUtils, 'generateGithubAppToken')
      .callsFake((installId: number) => {
        t.is(installId, 123);
        return 'example-app-token';
      });
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
  await new Promise((resolve) => t.context.server.close(resolve));
});

const handler = new AutoMergedNotification();

test.serial(
    '[handleStatus]: should not handle success hook if no PR Details',
    async (t) => {
      const userRecord = newFakeUserRecord();
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return userRecord;
      });

      const getPRDetailsStub =
          t.context.sandbox
              .stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
              .callsFake(() => {
                return null;
              });

      const response = await handler.handleWebhookEvent(payload('success'));
      t.is(response, null, 'webhook should not be handled.');
      t.deepEqual(
          getPRDetailsStub.callCount,
          1,
          'getPRDetailsFromCommit should be called once.');
      t.deepEqual(getPRDetailsStub.args[0][0], 'example-app-token');
      t.deepEqual(getPRDetailsStub.args[0][1], 'test-owner/test-repo');
      t.deepEqual(getPRDetailsStub.args[0][2], 'test-commit-SHA');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handleStatus]: should not handle error hook if no PR Details',
    async (t) => {
      const userRecord = newFakeUserRecord();
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return userRecord;
      });

      const getPRDetailsStub =
          t.context.sandbox
              .stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
              .callsFake(() => {
                return null;
              });

      const response = await handler.handleWebhookEvent(payload('error'));
      t.is(response, null, 'webhook should not be handled.');
      t.deepEqual(
          getPRDetailsStub.callCount,
          1,
          'getPRDetailsFromCommit should be called once.');
      t.deepEqual(getPRDetailsStub.args[0][0], 'example-app-token');
      t.deepEqual(getPRDetailsStub.args[0][1], 'test-owner/test-repo');
      t.deepEqual(getPRDetailsStub.args[0][2], 'test-commit-SHA');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handleStatus]: should not handle success hook if PR is not open',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return newFakeUserRecord();
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            const details = newFakePullRequestDetails();
            details.state = 'CLOSED';
            return details;
          });

      const response = await handler.handleWebhookEvent(payload('success'));
      t.is(response, null, 'webhook should not be handled.');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handleStatus]: should not handle error hook if PR is not open',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return newFakeUserRecord();
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            const details = newFakePullRequestDetails();
            details.state = 'CLOSED';
            return details;
          });

      const response = await handler.handleWebhookEvent(payload('error'));
      t.is(response, null, 'webhook should not be handled.');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handleStatus]: should not handle success hook if the commit SHA is not the latest',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return newFakeUserRecord();
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            const details = newFakePullRequestDetails();
            details.commit.oid = 'diff-commit-oid';
            return details;
          });

      const response = await handler.handleWebhookEvent(payload('success'));
      t.is(response, null, 'webhook should not be handled.');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handleStatus]: should not handle error hook if the commit SHA is not the latest',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return newFakeUserRecord();
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            const details = newFakePullRequestDetails();
            details.commit.oid = 'diff-commit-oid';
            return details;
          });

      const response = await handler.handleWebhookEvent(payload('error'));
      t.is(response, null, 'webhook should not be handled.');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial('[handleStatus]: should not handle pending hooks', async (t) => {
  t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
    return newFakeUserRecord();
  });

  t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
      .callsFake(() => {
        return newFakePullRequestDetails();
      });

  const response = await handler.handleWebhookEvent(payload('pending'));
  t.is(response, null, 'webhook should not be handled.');
  t.deepEqual(sendStub.callCount, 0, 'sendNotification should not be called');
});

test.serial(
    '[handleStatus]: should handle success hook but not do anything is commit isn\'t success',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return newFakeUserRecord();
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return newFakePullRequestDetails();
          });

      t.context.sandbox.stub(pullRequestsModel, 'getAutomergeOpts')
          .callsFake(async () => {
            return null;
          });

      const response = await handler.handleWebhookEvent(payload('success'));
      t.is(response, null, 'webhook should not be handled.');
      t.deepEqual(
          performAutomergeStub.callCount,
          0,
          'No automerge should be attempted');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handleStatus]: should handle success hook but not automerge if its not configured for PR',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return newFakeUserRecord();
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            const details = newFakePullRequestDetails();
            details.commit.state = 'SUCCESS';
            return details;
          });

      t.context.sandbox.stub(pullRequestsModel, 'getAutomergeOpts')
          .callsFake(async () => {
            return null;
          });

      const response = await handler.handleWebhookEvent(payload('success'));
      t.is(response, null, 'webhook should not be handled.');
      t.deepEqual(
          performAutomergeStub.callCount,
          0,
          'No automerge should be attempted');
      t.deepEqual(sendStub.callCount, 0, 'sendNotification should be called');
    });

test.serial(
    '[handleStatus]: should handle success hook but not automerge if mergeType is null',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return newFakeUserRecord();
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            const details = newFakePullRequestDetails();
            details.commit.state = 'SUCCESS';
            return details;
          });

      t.context.sandbox.stub(pullRequestsModel, 'getAutomergeOpts')
          .callsFake(async () => {
            return {
              mergeType: null,
            };
          });

      const response = await handler.handleWebhookEvent(payload('success'));
      t.is(response, null, 'webhook should not be handled.');
      t.deepEqual(
          performAutomergeStub.callCount,
          0,
          'No automerge should be attempted');
      t.deepEqual(sendStub.callCount, 0, 'sendNotification should be called');
    });

test.serial(
    '[handleStatus]: should handle success hook but not automerge if mergeType is manual',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return newFakeUserRecord();
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            const details = newFakePullRequestDetails();
            details.commit.state = 'SUCCESS';
            return details;
          });

      t.context.sandbox.stub(pullRequestsModel, 'getAutomergeOpts')
          .callsFake(async () => {
            return {
              mergeType: 'manual',
            };
          });

      const response = await handler.handleWebhookEvent(payload('success'));
      t.is(response, null, 'webhook should not be handled.');
      t.deepEqual(
          performAutomergeStub.callCount,
          0,
          'No automerge should be attempted');
      t.deepEqual(sendStub.callCount, 0, 'sendNotification should be called');
    });

test.serial(
    '[handleStatus]: should handle success hook and notify users of successful automerge',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return newFakeUserRecord();
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            const details = newFakePullRequestDetails();
            details.commit.state = 'SUCCESS';
            return details;
          });

      t.context.sandbox.stub(pullRequestsModel, 'getAutomergeOpts')
          .callsFake(async () => {
            return {
              mergeType: 'squash',
            };
          });

      performAutomergeStub.callsFake(() => {
        return Promise.resolve(true);
      });

      const response = await handler.handleWebhookEvent(payload('success'));
      t.not(response, null, 'webhook should be handled.');
      t.deepEqual(
          performAutomergeStub.callCount, 1, 'Automerge should be attempted');
      t.deepEqual(
          sendStub.callCount, 1, 'sendNotification should not be called');
      t.deepEqual(
          sendStub.args[0][0], 'test-pr-author', 'Notification receiver');
      t.deepEqual(
          sendStub.args[0][1],
          {
            title: 'Automerge complete for \'test-title\'',
            body: '[test-repo] test-title',
            icon: '/images/notification-images/icon-completed-192x192.png',
            data: {
              pullRequest: {
                gqlId: 'test-pr-id',
              },
              url: 'http://test-url.com',
            },
            requireInteraction: false,
            tag: 'pr-test-owner/test-repo/1',
          },
          'Notification options');
    });

test.serial(
    '[handleStatus]: should handle success hook and notify users of an errored automerge *without* Githubs error response msg',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return newFakeUserRecord();
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            const details = newFakePullRequestDetails();
            details.commit.state = 'SUCCESS';
            return details;
          });

      t.context.sandbox.stub(pullRequestsModel, 'getAutomergeOpts')
          .callsFake(async () => {
            return {
              mergeType: 'rebase',
            };
          });

      performAutomergeStub.callsFake(() => {
        return Promise.reject(new Error('Injected Error'));
      });

      const response = await handler.handleWebhookEvent(payload('success'));
      t.not(response, null, 'webhook should be handled.');
      t.deepEqual(
          performAutomergeStub.callCount, 1, 'Automerge should be attempted');
      t.deepEqual(
          sendStub.callCount, 1, 'sendNotification should not be called');
      t.deepEqual(
          sendStub.args[0][0], 'test-pr-author', 'Notification receiver');
      t.deepEqual(
          sendStub.args[0][1],
          {
            title: 'Automerge failed for \'test-title\'',
            body: '[test-repo] test-title',
            icon: '/images/notification-images/icon-error-192x192.png',
            data: {
              pullRequest: {
                gqlId: 'test-pr-id',
              },
              url: 'http://test-url.com',
            },
            requireInteraction: false,
            tag: 'pr-test-owner/test-repo/1',
          },
          'Notification options');
    });

test.serial(
    '[handleStatus]: should handle success hook and notify users of an errored automerge using Githubs error response msg',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return newFakeUserRecord();
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            const details = newFakePullRequestDetails();
            details.commit.state = 'SUCCESS';
            return details;
          });

      t.context.sandbox.stub(pullRequestsModel, 'getAutomergeOpts')
          .callsFake(async () => {
            return {
              mergeType: 'rebase',
            };
          });

      performAutomergeStub.callsFake(() => {
        return Promise.reject({
          error: {
            message: 'Injected Error',
          },
        });
      });


      const response = await handler.handleWebhookEvent(payload('success'));
      t.not(response, null, 'webhook should be handled.');
      t.deepEqual(
          performAutomergeStub.callCount, 1, 'Automerge should be attempted');
      t.deepEqual(
          sendStub.callCount, 1, 'sendNotification should not be called');
      t.deepEqual(
          sendStub.args[0][0], 'test-pr-author', 'Notification receiver');
      t.deepEqual(
          sendStub.args[0][1],
          {
            title: 'Automerge failed for \'test-title\'',
            body: '[test-repo] test-title',
            icon: '/images/notification-images/icon-error-192x192.png',
            data: {
              pullRequest: {
                gqlId: 'test-pr-id',
              },
              url: 'http://test-url.com',
            },
            requireInteraction: false,
            tag: 'pr-test-owner/test-repo/1',
          },
          'Notification options');
    });
