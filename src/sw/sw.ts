import {} from '.';
declare var self: ServiceWorkerGlobalScope;

import {NotificationPayload} from '../types/api';

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
