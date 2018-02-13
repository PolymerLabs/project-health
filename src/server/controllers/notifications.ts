import * as webpush from 'web-push';

import {NotificationPayload} from '../../types/api';
import {secrets} from '../../utils/secrets';
import {getSubscriptionModel} from '../models/pushSubscriptionModel';

export const sendNotification =
    async (recipient: string, data: NotificationPayload) => {
  const pushSubscriptionModel = getSubscriptionModel();
  const userSubscriptionDetails =
      await pushSubscriptionModel.getSubscriptionsForUser(recipient);

  webpush.setVapidDetails(
      'https://github-health.appspot.com',
      secrets().PUBLIC_VAPID_KEY,
      secrets().PRIVATE_VAPID_KEY,
  );

  if (process.env.NODE_ENV === 'test') {
    return;
  }

  return Promise.all(userSubscriptionDetails.map((subDetails) => {
    return webpush.sendNotification(subDetails.subscription, JSON.stringify(data))
        .catch(async (err) => {
            // 410 and 404 response from the Web Push module means
            // the subscription is no longer usable.
            if (err.statusCode === 410 || err.statusCode === 404) {
            await pushSubscriptionModel.removePushSubscription(recipient, subDetails.subscription);
            } else {
                console.error('Failed to send notification: ', err);
            }
        });
  }));
};
