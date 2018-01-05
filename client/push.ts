import {html, render} from './node_modules/lit-html/lit-html.js';

declare var PushManager: {
  supportedContentEncodings?: string[];
};

const PUBLIC_VAPID_KEY = 'BOX5Lqb44uosZL4_UtV7XW9dHaBj9ERFbCzlsYZBObMZjIB-yxPIbjI5pTBgIt09iy-Hl57AWpr7lJ6QXaQjy30';

async function updateBackend(isUnsubscribed: boolean, subscription: PushSubscription) {
  if (isUnsubscribed) {
    console.log('TODO: Must remove subscription from backend', subscription);
  } else {
    const bodyContent = {
      subscription: subscription.toJSON(),
      supportedContentEncodings: PushManager.supportedContentEncodings || [],
    };

    await fetch(`/api/push-subscription/add`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyContent),
    });
  }
}

/**
 * The pushManage.subscribe() method expects an ArrayBuffer and not a string.
 * This method converts a base64 string into a Uint8Array.
 *
 * (Note: The spec has changed to allow strings, but browser support is lacking)
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register a service worker for push messages - this will exclusively
 * handle push messages and not control any pages due to it's scope.
 */
function getRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/push-sw.js', {
    scope: '/__dash/push/',
  });
}

/**
 * A helper method to access the notification button Element.
 */
function getNotificationButton(): Element {
  const notificationBtn = document.querySelector('.notifications-button');
  if (!notificationBtn) {
    throw new Error('Unable to find notifications-button.');
  }

  return notificationBtn;
}

/**
 * Call this method whenever the notification button is clicked.
 */
async function onNotificationToggleClick() {
  const button = getNotificationButton();
  button.setAttribute('disabled', 'true');

  const registration = await getRegistration();
  let subscription = await registration.pushManager.getSubscription();
  const isUnsubscribed = !!subscription;
  if (subscription) {
    await subscription.unsubscribe();
  } else {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
    });
  }

  updateUI();

  await updateBackend(isUnsubscribed, subscription);

  button.removeAttribute('disabled');
}

/**
 * This method is called when the UI is updated. It ensures the correct
 * message is displayed to the user to enable or disable notifications.
 */
async function getNotificationButtonText() {
  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    return `Disable Notifications`;
  } else {
    return `Enable Notifications`;
  }
}

/**
 * This method will update the UI for push.
 */
async function updateUI() {
  const initialRender = html`
    <button class="notifications-button">
      ${getNotificationButtonText()}
    </button>
  `;

  render(initialRender, (document.querySelector('.push-container') as Element));
}

async function start() {
  if (!navigator.serviceWorker || !('PushManager' in window)) {
    return;
  }

  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await updateBackend(false, subscription);
  }

  updateUI();

  const notificationBtn = getNotificationButton();
  notificationBtn.addEventListener('click', onNotificationToggleClick);
}

start();
