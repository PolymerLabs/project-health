import {} from '.';
declare var self: ServiceWorkerGlobalScope;

import {NotificationPayload, NotificationURLData} from '../types/api';

// This is an "EventListener"
const pushEventHandler = {
  handleEvent: (event: PushEvent) => {
    if (!event.data) {
      return;
    }

    const data: NotificationPayload =
        (JSON.parse(event.data.text()) as NotificationPayload);
    event.waitUntil(self.registration.showNotification(
        data['title'],
        data,
        ));
  }
};

self.addEventListener('push', pushEventHandler);

type CustomNotification = {
  data: NotificationURLData|void;
};

const clickEventHandler = {
  handleEvent: (event: NotificationEvent) => {
    event.notification.close();

    // tslint:disable-next-line:no-any
    const notification = ((event.notification as any) as CustomNotification);
    const data = notification.data;
    if (data && data.url) {
      // There was a URL provided with the notification payload - open it if
      // the user clicks on the notifications
      const openWindowPromise = self.clients.openWindow(data.url);
      // Wait for the window to open for letting the browser kill the service
      // worker
      event.waitUntil(openWindowPromise);
    }
  }
};

self.addEventListener('notificationclick', clickEventHandler);