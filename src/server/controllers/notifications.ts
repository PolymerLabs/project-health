import * as webpush from 'web-push';

import {NotificationPayload} from '../../types/api';
import {DashSecrets} from '../dash-server';
import {pushSubscriptionModel} from '../models/pushSubscriptionModel';

export const sendNotification =
    (secrets: DashSecrets, recipient: string, data: NotificationPayload) => {
      const userSubscriptionDetails =
          pushSubscriptionModel.getSubscriptionsForUser(recipient);
      if (!userSubscriptionDetails) {
        return;
      }

      webpush.setVapidDetails(
          'https://github-health.appspot.com',
          secrets.PUBLIC_VAPID_KEY,
          secrets.PRIVATE_VAPID_KEY,
      );

      for (const subscriptionDetails of userSubscriptionDetails) {
        webpush.sendNotification(
            subscriptionDetails.subscription, JSON.stringify(data));
      }
    };
