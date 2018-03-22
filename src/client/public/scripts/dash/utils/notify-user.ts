import {NotificationPayload} from '../../../../../types/api.js';

import {hasPushEnabled} from './has-push-enabled.js';

export async function notifyUser(title: string, options: NotificationPayload) {
  if (!await hasPushEnabled()) {
    return;
  }

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    return;
  }

  await reg.showNotification(title, options);
}
