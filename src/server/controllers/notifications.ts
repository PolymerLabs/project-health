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

  return Promise.all(userSubscriptionDetails.map((subDetails) => {
    webpush.sendNotification(subDetails.subscription, JSON.stringify(data));
  }));
};
