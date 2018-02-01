import test from 'ava';

import {pushSubscriptionModel} from '../../models/pushSubscriptionModel';

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

test.beforeEach(() => {
  const subscriptions = pushSubscriptionModel.getSubscriptionsForUser(USER_LOGIN);
  if (subscriptions) {
    const subscriptionKeys =Object.keys(subscriptions);
    subscriptionKeys.forEach((subKey) => {
      const subscriptionInfo = subscriptions[subKey];
      pushSubscriptionModel.removePushSubscription(USER_LOGIN, subscriptionInfo.subscription);
    });
  }
});

test('addPushSubscription should support multiple subscriptions', (t) => {
  pushSubscriptionModel.addPushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION, CONTENT_ENCODINGS);
  pushSubscriptionModel.addPushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION_2, []);
  t.pass();
});

test(`removePushSubscription non-existant subscription`, (t) => {
  pushSubscriptionModel.removePushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION);
  t.pass();
});

test('removePushSubscription existing subscription', (t) => {
  pushSubscriptionModel.addPushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION, CONTENT_ENCODINGS);
  pushSubscriptionModel.removePushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION);
  t.pass();
});

test('getSubscriptionsForUser for user with no subscriptions', (t) => {
  const subscriptions = pushSubscriptionModel.getSubscriptionsForUser(USER_LOGIN);
  t.deepEqual(subscriptions, null);
});

test('getSubscriptionsForUser for specific user', (t) => {
  pushSubscriptionModel.addPushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION, CONTENT_ENCODINGS);
  pushSubscriptionModel.addPushSubscription('unknown-user', PUSH_SUBSCRIPTION_2, []);

  const subscriptionsAfterAdd = pushSubscriptionModel.getSubscriptionsForUser(USER_LOGIN);
  t.deepEqual(subscriptionsAfterAdd, {
    [PUSH_SUBSCRIPTION.endpoint]: {
      subscription: PUSH_SUBSCRIPTION,
      supportedContentEncodings: CONTENT_ENCODINGS,
    },
  });
});

test('getSubscriptionsForUser during adding and removal', (t) => {
  pushSubscriptionModel.addPushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION, CONTENT_ENCODINGS);
  pushSubscriptionModel.addPushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION_2, []);

  const subscriptionsAfterAdd = pushSubscriptionModel.getSubscriptionsForUser(USER_LOGIN);
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

  pushSubscriptionModel.removePushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION_2);

  const subscriptionsAfterRemove = pushSubscriptionModel.getSubscriptionsForUser(USER_LOGIN);
  t.deepEqual(subscriptionsAfterRemove, {
    [PUSH_SUBSCRIPTION.endpoint]: {
      subscription: PUSH_SUBSCRIPTION,
      supportedContentEncodings: CONTENT_ENCODINGS,
    },
  });

  pushSubscriptionModel.removePushSubscription(USER_LOGIN, PUSH_SUBSCRIPTION);

  const allSubscriptionsRemoved = pushSubscriptionModel.getSubscriptionsForUser(USER_LOGIN);
  t.deepEqual(allSubscriptionsRemoved, null);
});
