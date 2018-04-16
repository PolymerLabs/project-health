import anyTest, {TestInterface} from 'ava';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';
import * as webpush from 'web-push';

import {sendNotification} from '../../../server/controllers/notifications';
import {getSubscriptionModel} from '../../../server/models/pushSubscriptionModel';
import {initSecrets} from '../../../utils/secrets';
import {newFakeSecrets} from '../../utils/newFakeSecrets';

type TestContext = {
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

const SAMPLE_DATA = {
  title: 'title',
  body: 'body',
  requireInteraction: true,
  data: undefined,
  tag: '',
};

test.before(() => {
  initSecrets(newFakeSecrets());
});

test.beforeEach(async (t) => {
  t.context = {
    sandbox: sinon.sandbox.create(),
  };
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
});

test.serial('[notifications] should handle no subscriptions', async (t) => {
  const model = getSubscriptionModel();
  t.context.sandbox.stub(model, 'getSubscriptionsForUser')
      .callsFake(async () => {
        return [];
      });
  const results = await sendNotification('no-user', SAMPLE_DATA);
  t.deepEqual(results, {
    errors: [],
    recipient: 'no-user',
    sent: {
      success: 0,
      failed: 0,
      removed: 0,
    }
  });
});

test.serial('[notifications] should send to a subscriptions', async (t) => {
  const userSubscriptions = [
    {
      subscription: {
        endpoint: 'http://example.com/123',
      }
    },
  ];
  const model = getSubscriptionModel();
  t.context.sandbox.stub(model, 'getSubscriptionsForUser')
      .callsFake(async () => {
        return userSubscriptions;
      });
  const webpushStub = t.context.sandbox.stub(webpush, 'sendNotification')
                          .callsFake(async () => {});

  const results = await sendNotification('valid-user', SAMPLE_DATA);
  t.deepEqual(results, {
    errors: [],
    recipient: 'valid-user',
    sent: {
      success: 1,
      failed: 0,
      removed: 0,
    }
  });

  t.deepEqual(webpushStub.callCount, 1);
  t.deepEqual(webpushStub.args[0][0], userSubscriptions[0].subscription);
  t.deepEqual(webpushStub.args[0][1], JSON.stringify({
    icon: '/images/notification-images/icon-192x192.png',
    badge: '/images/notification-images/badge-128x128.png',
    title: 'title',
    body: 'body',
    requireInteraction: true,
    data: undefined,
    tag: '',
  }));
  t.deepEqual(webpushStub.args[0][2], {
    TTL: 12 * 60 * 60,
  });
});

test.serial('[notifications] should return errored sends', async (t) => {
  const userSubscriptions = [
    {
      subscription: {
        endpoint: 'http://example.com/123',
      }
    },
  ];
  const model = getSubscriptionModel();
  t.context.sandbox.stub(model, 'getSubscriptionsForUser')
      .callsFake(async () => {
        return userSubscriptions;
      });
  t.context.sandbox.stub(webpush, 'sendNotification').callsFake(async () => {
    throw new Error('Injected throw');
  });

  const results = await sendNotification('valid-user', SAMPLE_DATA);
  t.deepEqual(results, {
    errors: ['Injected throw'],
    recipient: 'valid-user',
    sent: {
      success: 0,
      failed: 1,
      removed: 0,
    }
  });
});

test.serial('[notifications] should handle push deletion', async (t) => {
  const userSubscriptions = [
    {
      subscription: {
        endpoint: 'http://example.com/123',
      }
    },
  ];
  const model = getSubscriptionModel();
  t.context.sandbox.stub(model, 'getSubscriptionsForUser')
      .callsFake(async () => {
        return userSubscriptions;
      });
  const removeStub = t.context.sandbox.stub(model, 'removePushSubscription')
                         .callsFake(async () => {});
  t.context.sandbox.stub(webpush, 'sendNotification').callsFake(async () => {
    throw {
      statusCode: 410,
    };
  });

  const results = await sendNotification('valid-user', SAMPLE_DATA);
  t.deepEqual(results, {
    errors: [],
    recipient: 'valid-user',
    sent: {
      success: 0,
      failed: 0,
      removed: 1,
    }
  });
  t.deepEqual(removeStub.callCount, 1);
  t.deepEqual(removeStub.args[0][0], 'valid-user');
  t.deepEqual(removeStub.args[0][1], userSubscriptions[0].subscription);
});
