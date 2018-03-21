import test from 'ava';

import {getSubscriptionModel} from '../../../server/models/pushSubscriptionModel';
import {initFirestore} from '../../../utils/firestore';

const USER_LOGIN = 'tests';
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

test.before(() => {
  initFirestore();
});

test.beforeEach(async () => {
  const pushSubscriptionModel = getSubscriptionModel();
  const subscriptions =
      await pushSubscriptionModel.getSubscriptionsForUser(USER_LOGIN);
  for (const subscriptionInfo of subscriptions) {
    await pushSubscriptionModel.removePushSubscription(
        USER_LOGIN, subscriptionInfo.subscription);
  }
});

test(
    '[PushSubscriptionModel] getSubscriptionsForUser, addPushSubscription and removeSubscriptionForUser test',
    async (t) => {
      const pushSubscriptionModel = getSubscriptionModel();

      // Ensure no subscriptions at first
      const subscriptions =
          await pushSubscriptionModel.getSubscriptionsForUser(USER_LOGIN);
      t.deepEqual(subscriptions, [], 'Initally have no subscriptions');

      await pushSubscriptionModel.addPushSubscription(
          USER_LOGIN, PUSH_SUBSCRIPTION, CONTENT_ENCODINGS);
      await pushSubscriptionModel.addPushSubscription(
          USER_LOGIN, PUSH_SUBSCRIPTION_2, []);

      const subscriptionsAfterAdd =
          await pushSubscriptionModel.getSubscriptionsForUser(USER_LOGIN);
      t.deepEqual(
          subscriptionsAfterAdd,
          [
            {
              subscription: PUSH_SUBSCRIPTION,
              supportedContentEncodings: CONTENT_ENCODINGS,
            },
            {
              subscription: PUSH_SUBSCRIPTION_2,
              supportedContentEncodings: [],
            },
          ],
          'The subscriptions added to the model');

      await pushSubscriptionModel.removePushSubscription(
          USER_LOGIN, PUSH_SUBSCRIPTION_2);

      const subscriptionsAfterRemove =
          await pushSubscriptionModel.getSubscriptionsForUser(USER_LOGIN);
      t.deepEqual(subscriptionsAfterRemove, [
        {
          subscription: PUSH_SUBSCRIPTION,
          supportedContentEncodings: CONTENT_ENCODINGS,
        },
      ]);

      await pushSubscriptionModel.removePushSubscription(
          USER_LOGIN, PUSH_SUBSCRIPTION);

      const allSubscriptionsRemoved =
          await pushSubscriptionModel.getSubscriptionsForUser(USER_LOGIN);
      t.deepEqual(allSubscriptionsRemoved, []);
    });
