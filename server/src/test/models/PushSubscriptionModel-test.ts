import test from 'ava';

import { PushSubscriptionModel } from '../../models/PushSubscriptionModel';

const USER_LOGIN = 'user-login';
const PUSH_SUBSCRIPTION = {
  endpoint: 'https://project-health.appspot.com/push-service/123',
  keys: {
    'auth': 'auth-123',
    'p256dh': 'p256dh-123',
  },
  expirationTime: null,
};
const PUSH_SUBSCRIPTION_2 = {
  endpoint: 'https://project-health.appspot.com/push-service/456',
  keys: {
    'auth': 'auth-456',
    'p256dh': 'p256dh-456',
  },
  expirationTime: null,
};
const CONTENT_ENCODINGS = ['aes128gcm', 'aesgcm'];

test(`constructor`, (t) => {
  const model = new PushSubscriptionModel();
  t.truthy(model);
});

test(`addPushSubscription should support multiple subscriptions`, (t) => {
  const model = new PushSubscriptionModel();
  model.addPushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION, CONTENT_ENCODINGS);
  model.addPushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION_2, []);
  t.pass();
});

test(`removePushSubscription non-existant subscription`, (t) => {
  const model = new PushSubscriptionModel();
  model.removePushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION);
  t.pass();
});

test(`removePushSubscription existing subscription`, (t) => {
  const model = new PushSubscriptionModel();
  model.addPushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION, CONTENT_ENCODINGS);
  model.removePushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION);
  t.pass();
});

test(`getSubscriptionsForUser for user with no subscriptions`, (t) => {
  const model = new PushSubscriptionModel();
  const subscriptions = model.getSubscriptionsForUser(USER_LOGIN);
  t.deepEqual(subscriptions, null);
});

test(`getSubscriptionsForUser for specific user`, (t) => {
  const model = new PushSubscriptionModel();

  model.addPushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION, CONTENT_ENCODINGS);
  model.addPushSubscription('unknown-user', PUSH_SUBSCRIPTION_2, []);

  const subscriptionsAfterAdd = model.getSubscriptionsForUser(USER_LOGIN);
  t.deepEqual(subscriptionsAfterAdd, {
    [PUSH_SUBSCRIPTION.endpoint]: {
      subscription: PUSH_SUBSCRIPTION,
      supportedContentEncodings: CONTENT_ENCODINGS,
    },
  });
});

test(`getSubscriptionsForUser during adding and remove of subscriptiosn`, (t) => {
  const model = new PushSubscriptionModel();

  model.addPushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION, CONTENT_ENCODINGS);
  model.addPushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION_2, []);

  const subscriptionsAfterAdd = model.getSubscriptionsForUser(USER_LOGIN);
  t.deepEqual(subscriptionsAfterAdd, {
    [PUSH_SUBSCRIPTION.endpoint]: {
      subscription: PUSH_SUBSCRIPTION,
      supportedContentEncodings: CONTENT_ENCODINGS,
    },
    [PUSH_SUBSCRIPTION_2.endpoint]: {
      subscription: PUSH_SUBSCRIPTION_2,
      supportedContentEncodings: [],
    },
  });

  model.removePushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION_2);

  const subscriptionsAfterRemove = model.getSubscriptionsForUser(USER_LOGIN);
  t.deepEqual(subscriptionsAfterRemove, {
    [PUSH_SUBSCRIPTION.endpoint]: {
      subscription: PUSH_SUBSCRIPTION,
      supportedContentEncodings: CONTENT_ENCODINGS,
    },
  });

  model.removePushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION);

  const allSubscriptionsRemoved = model.getSubscriptionsForUser(USER_LOGIN);
  t.deepEqual(allSubscriptionsRemoved, null);
});
