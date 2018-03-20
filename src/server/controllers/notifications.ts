import * as webpush from 'web-push';

import {NotificationPayload} from '../../types/api';
import {secrets} from '../../utils/secrets';
import {getSubscriptionModel} from '../models/pushSubscriptionModel';

export interface NotificationsSent {
  recipient: string;
  sent: {success: number; failed: number; removed: number;};
  errors: string[];
}

export async function sendNotification(
    recipient: string, data: NotificationPayload): Promise<NotificationsSent> {
  const sendDetails: NotificationsSent = {
    recipient,
    sent: {
      success: 0,
      failed: 0,
      removed: 0,
    },
    errors: [],
  };
  const pushSubscriptionModel = getSubscriptionModel();
  const userSubscriptionDetails =
      await pushSubscriptionModel.getSubscriptionsForUser(recipient);

  webpush.setVapidDetails(
      'https://github-health.appspot.com',
      secrets().PUBLIC_VAPID_KEY,
      secrets().PRIVATE_VAPID_KEY,
  );

  const finalData = Object.assign(
      {
        icon: '/images/notification-images/icon-192x192.png',
        badge: '/images/notification-images/badge-128x128.png',
      },
      data);

  await Promise.all(userSubscriptionDetails.map(async (subDetails) => {
    const options = {
      // TTL in seconds (12 Hours). After which, notification will not
      // be delivered.
      TTL: 12 * 60 * 60,
    };
    try {
      await webpush.sendNotification(
          subDetails.subscription, JSON.stringify(finalData), options);
      sendDetails.sent.success++;
    } catch (err) {
      // 410 and 404 response from the Web Push module means
      // the subscription is no longer usable.
      if (err.statusCode === 410 || err.statusCode === 404) {
        await pushSubscriptionModel.removePushSubscription(
            recipient, subDetails.subscription);
        sendDetails.sent.removed++;
      } else {
        if (process.env.NODE_ENV !== 'test') {
          console.error('Failed to send notification: ', err);
        }
        sendDetails.sent.failed++;
        sendDetails.errors.push(err.message);
      }
    }
  }));

  return sendDetails;
}

export function getPRTag(owner: string, repo: string, prNumber: number) {
  return `pr-${owner}/${repo}/${prNumber}`;
}
