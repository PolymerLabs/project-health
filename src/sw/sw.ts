import {} from '.';
declare var self: ServiceWorkerGlobalScope;

import {NotificationPayload, NotificationURLData, SWClientMessage} from '../types/api';
import {Analytics} from './analytics';

const STAGING_TRACKING_ID = 'UA-114703954-2';
const PROD_TRACKING_ID = 'UA-114703954-1';

let trackingId = STAGING_TRACKING_ID;
if (self.location.origin === 'https://github-health.appspot.com') {
  trackingId = PROD_TRACKING_ID;
}

const analytics = new Analytics(trackingId);

async function pingAnalytics(eventAction: string) {
  let clientID = 'unknown-client-id';

  if ('pushManager' in self.registration) {
    const subscription = await self.registration.pushManager.getSubscription();
    if (subscription) {
      clientID = subscription.endpoint;
    }
  }

  await analytics.trackEvent(clientID, eventAction);
}

type CustomNotification = {
  data: NotificationURLData|void;
};

// This is displayed iff there is no data in the payload
const DEFAULT_NOTIFICATION_OPTIONS: NotificationPayload = {
  title: 'New Github Health Updates',
  body: 'Click the notification to view updates',
  requireInteraction: false,
  data: {
    url: new URL('/', self.location.origin).toString(),
  },
  tag: 'default-notification',
};

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
  await self.registration.showNotification(
      data.title,
      data,
  );

  await pingAnalytics('notification-shown');
}

// This is an "EventListener"
const pushEventHandler = {
  handleEvent: (event: PushEvent) => {
    event.waitUntil(pingAnalytics('push-received'));

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
    event.waitUntil(pingAnalytics('notification-click'));
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
