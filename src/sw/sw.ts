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
    if (notification.data && notification.data.url) {
      event.waitUntil(self.clients.openWindow(notification.data.url));
    }
  }
};

self.addEventListener('notificationclick', clickEventHandler);