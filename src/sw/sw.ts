import {} from '.';
declare var self: ServiceWorkerGlobalScope;

import {NotificationPayload, NotificationData, SWClientMessage, CheckPRPayload} from '../types/api';
import {trackEvent} from '../client/public/scripts/utils/track-event';

type CustomNotification = {
  data: NotificationData|void; close: () => Promise<void>;
};

// This is displayed iff there is no data in the payload
const DEFAULT_NOTIFICATION_OPTIONS: NotificationPayload = {
  title: 'New Github Health Updates',
  body: 'Click the notification to view updates',
  icon: '/images/notification-images/icon-192x192.png',
  badge: '/images/notification-images/badge-128x128.png',
  requireInteraction: false,
  data: {
    url: new URL('/', self.location.origin).toString(),
  },
  tag: 'default-notification',
};

async function cleanupNotifications(notifications: CustomNotification[]):
    Promise<void> {
  try {
    // Using set to remove duplicates
    const openPullRequests = new Set();
    // This map allows us to link notifications to a specific PR
    const prsToNotifications: {[key: string]: CustomNotification[]} = {};

    for (let i = 0; i < notifications.length; i++) {
      const notification: CustomNotification =
          // tslint:disable-next-line:no-any
          (notifications[i] as any) as CustomNotification;
      if (!notification.data) {
        continue;
      }

      const data: NotificationData = notification.data;
      if (data.pullRequest) {
        openPullRequests.add(data.pullRequest.gqlId);

        if (!prsToNotifications[data.pullRequest.gqlId]) {
          prsToNotifications[data.pullRequest.gqlId] = [];
        }
        prsToNotifications[data.pullRequest.gqlId].push(notification);
      }
    }

    // Convert the set (used to remove duplicates) and create an array
    // of PR's to check state of.
    const pullRequestDetails = Array.from(openPullRequests);

    // If there are no pull requests, don't bother making a network
    // request.
    if (pullRequestDetails.length === 0) {
      return;
    }

    const response = await fetch('/api/check-pr-state', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pullRequestDetails),
    });

    if (!response.ok) {
      console.warn('Unable to check PR states and clean up notifications');
      console.warn(await response.text());
      return;
    }

    const responseBody = await response.json();
    if (responseBody.error) {
      console.warn(
          'Check PR state API returned an error: ', responseBody.error);
      return;
    }

    const data = responseBody.data as CheckPRPayload;
    for (const pullRequest of data.pullRequests) {
      if (pullRequest.state === 'CLOSED' || pullRequest.state === 'MERGED') {
        const notifications = prsToNotifications[pullRequest.gqlId];

        // Close all notifications for this PR.
        for (const notification of notifications) {
          await notification.close();
        }
      }
    }
  } catch (err) {
    console.warn('Unable to clean up notifications: ', err);
  }
}

async function getWindowClients(): Promise<WindowClient[]> {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  });
  return clients as WindowClient[];
}

async function updateDashClients() {
  const message: SWClientMessage<void> = {
    action: 'push-received',
    data: undefined,
  };

  const windowClients = await getWindowClients();
  windowClients.forEach((windowClient) => {
    windowClient.postMessage(message);
  });
}

async function showNotification(data: NotificationPayload) {
  // First go through open notifications and collate the PR's
  const previousNotifications = await self.registration.getNotifications();

  await self.registration.showNotification(
      data.title,
      data,
  );

  await Promise.all([
    trackEvent('notification', 'shown'),
    cleanupNotifications(
        // tslint:disable-next-line: no-any
        (previousNotifications as any) as CustomNotification[],
        )
  ]);
}

// This is an "EventListener"
const pushEventHandler = {
  handleEvent: (event: PushEvent) => {
    event.waitUntil(trackEvent('push', 'received'));

    let notificationData = DEFAULT_NOTIFICATION_OPTIONS;
    if (event.data) {
      try {
        notificationData = JSON.parse(event.data.text()) as NotificationPayload;
      } catch (err) {
        console.log('Unable to parse received push: ', err);
      }
    }

    event.waitUntil(showNotification(notificationData));
    event.waitUntil(updateDashClients());
  }
};

self.addEventListener('push', pushEventHandler);

async function openWindow(url: string) {
  const windowClients = await getWindowClients();

  let matchingWindowClient = null;
  const fullUrlToOpen = new URL(url, self.location.href);
  for (const windowClient of windowClients) {
    const windowUrl = new URL(windowClient.url, self.location.href);
    if (windowUrl.href === fullUrlToOpen.href) {
      matchingWindowClient = windowClient;
      break;
    }
  }

  if (matchingWindowClient) {
    await matchingWindowClient.focus();
  } else {
    await self.clients.openWindow(url);
  }
}

const clickEventHandler = {
  handleEvent: (event: NotificationEvent) => {
    event.waitUntil(trackEvent('notification', 'click'));
    event.notification.close();

    // tslint:disable-next-line:no-any
    const notification = ((event.notification as any) as CustomNotification);
    const data = notification.data;
    if (data && data.url) {
      event.waitUntil(openWindow(data.url));
    }
  }
};

self.addEventListener('notificationclick', clickEventHandler);
