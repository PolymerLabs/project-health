import anyTest, {TestInterface} from 'ava';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import * as notificationController from '../../../../../server/controllers/notifications';
import {ReviewRequestedNotification} from '../../../../../server/controllers/webhook-handlers/notifications/review-request';
import {userModel} from '../../../../../server/models/userModel';
import * as getPRIDModule from '../../../../../server/utils/get-gql-pr-id';
import {newFakeUserRecord} from '../../../../utils/newFakeUserRecord';

const reviewRequestedNotification = new ReviewRequestedNotification();

const hookJsonDir =
    path.join(__dirname, '..', '..', '..', '..', 'static', 'webhook-data');

type TestContext = {
  sandbox: SinonSandbox
};
const test = anyTest as TestInterface<TestContext>;

test.beforeEach(async (t) => {
  t.context.sandbox = sinon.sandbox.create();
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
});

test.serial('[review-request-notification] review requested', async (t) => {
  const sendStub =
      t.context.sandbox.stub(notificationController, 'sendNotification');

  t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
    return newFakeUserRecord();
  });

  t.context.sandbox.stub(getPRIDModule, 'getPRID').callsFake(() => {
    return 'injected-pr-id';
  });

  const eventContent = await fs.readJSON(
      path.join(hookJsonDir, 'pull_request', 'review_requested.json'));
  const response = await reviewRequestedNotification.handleWebhookEvent(
      Object.assign({type: 'pull_request'}, eventContent));
  t.not(response, null, 'response should not be null');
  t.deepEqual(sendStub.callCount, 1);
  t.deepEqual(sendStub.args[0], [
    'gauntface',
    {
      title: 'samuelli requested a review',
      body: '[project-health] Refactor api responses to use typed responses',
      requireInteraction: true,
      tag: 'pr-PolymerLabs/project-health/527',
      data: {
        pullRequest: {
          gqlId: 'injected-pr-id',
        },
        url: 'https://github.com/PolymerLabs/project-health/pull/527',
      }
    }
  ]);
});

test.serial(
    '[review-request-notification] ignores other payloads', async (t) => {
      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');

      const eventContent = await fs.readJSON(
          path.join(hookJsonDir, 'pull_request', 'edited-open.json'));
      const response = await reviewRequestedNotification.handleWebhookEvent(
          Object.assign({type: 'pull_request'}, eventContent));

      t.is(response, null, 'should be ignored');
      t.deepEqual(sendStub.callCount, 0);
    });
