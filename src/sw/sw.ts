import {} from '.';
declare var self: ServiceWorkerGlobalScope;

import {NotificationPayload, NotificationURLData, SWClientMessage} from '../types/api';
import {Analytics} from './analytics';

const analytics = new Analytics('UA-114703954-1');

async function pingAnalytics(eventAction: string, eventValue: string) {
  let clientID = 'unknown-client-id';

  if ('pushManager' in self.registration) {
    const subscription = await self.registration.pushManager.getSubscription();
    if (subscription) {
      clientID = subscription.endpoint;
    }
  }

  await analytics.trackEvent(clientID, eventAction, eventValue);
}

type CustomNotification = {
  data: NotificationURLData|void;
};

// This is displayed iff there is no data in the payload
const DEFAULT_NOTIFICATION_OPTIONS: NotificationPayload = {
  title: 'New Github Health Updates',
  body: 'Click the notification to view updates',
  icon: '/images/notification-images/icon-192x192.png',
  requireInteraction: false,
  data: {
    url: new URL('/', self.location.origin).toString(),
  },
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
  const windowClients = await getWindowClients();

  let mustShowNotification = true;
  for (const windowClient of windowClients) {
    if (windowClient.visibilityState === 'visible') {
      mustShowNotification = false;
      break;
    }
  }

  // If the user is focused - we don't need to show a notification and simply
  // update the page (Done via updateDashClients)
  if (mustShowNotification) {
    await self.registration.showNotification(
        data.title,
        data,
    );
  }

  const eventValue =
      mustShowNotification ? 'notification-shown' : 'page-visible';
  await pingAnalytics('push-event', eventValue);
}

// This is an "EventListener"
const pushEventHandler = {
  handleEvent: (event: PushEvent) => {
    event.waitUntil(pingAnalytics('push-event', 'push-received'));

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
