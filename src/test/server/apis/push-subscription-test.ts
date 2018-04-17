import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {handlePushSubscriptionAction} from '../../../server/apis/push-subscription';
import {initFirestore} from '../../../utils/firestore';
import {initGithub} from '../../../utils/github';
import {newFakeRequest} from '../../utils/newFakeRequest';
import {newFakeUserRecord} from '../../utils/newFakeUserRecord';
import {startTestReplayServer} from '../../utils/replay-server';

type TestContext = {
  replayServer: Server,
  replayAddress: string,
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
});

/**
 * Generates the test context object before each test.
 */
test.beforeEach(async (t) => {
  const {server, url} = await startTestReplayServer(t);
  initGithub(url, url);

  t.context = {
    replayServer: server,
    replayAddress: url,
    sandbox: sinon.sandbox.create(),
  };
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
  await new Promise((resolve) => {
    t.context.replayServer.close(resolve);
  });
});

test.serial(
    '[handlePushSubscriptionAction]: should return an error for unknown action',
    async (t) => {
      const userRecord = newFakeUserRecord();
      const response =
          await handlePushSubscriptionAction(newFakeRequest(), userRecord);
      t.is(response.statusCode, 400, 'Response status code');
      if ('data' in response) {
        throw new Error('Expected an error response');
      }
      t.is(response.error.code, 'unknown-action');
    });

test.serial(
    '[handlePushSubscriptionAction]: should add a push subscription user',
    async (t) => {
      const userRecord = newFakeUserRecord();
      const request = newFakeRequest();
      request.params.action = 'add';

      request.body.subscription = {
        endpoint: 'http://example.com/push-endpoint',
        keys: {
          'p256dh': 'example-p256dh-key',
          'auth': 'example-auth-key',
        }

      };
      request.body.supportedContentEncodings = ['aesgcm', 'aes128gcm'];

      const response = await handlePushSubscriptionAction(request, userRecord);
      t.is(response.statusCode, 200, 'Response status code');
      if ('error' in response) {
        throw new Error('Expected a data response');
      }
      t.is(response.data.status, 'ok');
    });


test.serial(
    '[handlePushSubscriptionAction]: should remove a push subscription user',
    async (t) => {
      const userRecord = newFakeUserRecord();
      const request = newFakeRequest();
      request.params.action = 'remove';

      request.body.subscription = {
        endpoint: 'http://example.com/push-endpoint',
        keys: {
          'p256dh': 'example-p256dh-key',
          'auth': 'example-auth-key',
        }

      };

      const response = await handlePushSubscriptionAction(request, userRecord);
      t.is(response.statusCode, 200, 'Response status code');
      if ('error' in response) {
        throw new Error('Expected a data response');
      }
      t.is(response.data.status, 'ok');
    });
