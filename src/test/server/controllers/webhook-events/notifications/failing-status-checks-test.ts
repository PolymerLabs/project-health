import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';
import * as sinon from 'sinon';
import {SinonSandbox, SinonStub} from 'sinon';

import * as notificationController from '../../../../../server/controllers/notifications';
import {FailingStatusChecksNotification} from '../../../../../server/controllers/webhook-handlers/notifications/failing-status-checks';
import {pullRequestsModel} from '../../../../../server/models/pullRequestsModel';
import {userModel} from '../../../../../server/models/userModel';
import * as getPRFromCommitModule from '../../../../../server/utils/get-pr-from-commit';
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
    name: 'project-health/status-test',
    state,
    description: 'test-description',
    target_url: null,
    branches: [],
    repository: {
      name: 'status-test',
      owner: {
        login: 'status-owner-login',
      },
      full_name: 'status-owner-login/status-test',
    },
    commit: {
      author: {
        login: 'status-commit-author',
      },
      sha: '123sha'
    },
  };
}

type TestContext = {
  server: Server,
  sandbox: SinonSandbox
};
const test = anyTest as TestInterface<TestContext>;

let sendStub: SinonStub;

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
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
  await new Promise((resolve) => t.context.server.close(resolve));
});

const handler = new FailingStatusChecksNotification();

test.serial(
    '[handleStatus]: should notify author for new error hook', async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return newFakeUserRecord();
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return newFakePullRequestDetails();
          });

      t.context.sandbox.stub(pullRequestsModel, 'getCommitDetails')
          .callsFake(() => {
            return Promise.resolve(null);
          });

      const response = await handler.handleWebhookEvent(payload('error'));
      t.not(response, null, 'webhook should be handled');
      t.deepEqual(sendStub.callCount, 1, 'sendNotification should be called');
      t.deepEqual(
          sendStub.args[0][0], 'test-pr-author', 'Notification receiver');
      t.deepEqual(
          sendStub.args[0][1],
          {
            title: 'test-description',
            body: '[status-test] test-title',
            icon: '/images/notification-images/icon-error-192x192.png',
            data: {
              pullRequest: {
                gqlId: 'test-pr-id',
              },
              url: 'http://test-url.com',
            },
            requireInteraction: false,
            tag: 'pr-status-owner-login/status-test/1',
          },
          'Notification options');
    });

test.serial(
    '[handleStatus]: should notify author for error hook if new state is different from previous state',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return newFakeUserRecord();
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return newFakePullRequestDetails();
          });

      t.context.sandbox.stub(pullRequestsModel, 'getCommitDetails')
          .callsFake(() => {
            return Promise.resolve({
              status: 'SUCCESS',
            });
          });

      const response = await handler.handleWebhookEvent(payload('error'));
      t.not(response, null, 'webhook should be handled');
      t.deepEqual(sendStub.callCount, 1, 'sendNotification should be called');
      t.deepEqual(
          sendStub.args[0][0], 'test-pr-author', 'Notification receiver');
      t.deepEqual(
          sendStub.args[0][1],
          {
            title: 'test-description',
            body: '[status-test] test-title',
            icon: '/images/notification-images/icon-error-192x192.png',
            data: {
              pullRequest: {
                gqlId: 'test-pr-id',
              },
              url: 'http://test-url.com',
            },
            requireInteraction: false,
            tag: 'pr-status-owner-login/status-test/1',
          },
          'Notification options');
    });

test.serial(
    '[handleStatus]: should do nothing for error hook if the commits state is the same',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return newFakeUserRecord();
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return newFakePullRequestDetails();
          });

      t.context.sandbox.stub(pullRequestsModel, 'getCommitDetails')
          .callsFake(() => {
            return Promise.resolve({
              status: 'error',
            });
          });

      const response = await handler.handleWebhookEvent(payload('error'));
      t.is(response, null, 'webhook should not be handled');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });
