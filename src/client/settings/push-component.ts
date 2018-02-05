import {addSubscriptionToBackend, removeSubscriptionFromBackend} from './push-backend.js';
import {applicationServerKey} from './push-details.js';

let pushToggle: HTMLInputElement;
let pushStatus: Element;

interface PushComponentState {
  isSupported: boolean;
  permissionBlocked: boolean;
  subscription: PushSubscription|null;
}

function getRegistration() {
  return navigator.serviceWorker.register('/sw.js');
}

async function getState() {
  const state: PushComponentState = {
    isSupported: false,
    permissionBlocked: false,
    subscription: null,
  };

  state.isSupported = !(!navigator.serviceWorker || !('PushManager' in window));

  // Run async tasks in parallel
  await Promise.all([
    (async () => {
      const registration = await getRegistration();
      state.subscription = await registration.pushManager.getSubscription();
    })(),
    (async () => {
      const permissionState =
          // tslint:disable-next-line:no-any
          await (navigator as any).permissions.query({name: 'notifications'});
      state.permissionBlocked = permissionState.state === 'denied';
    })()
  ]);

  return state;
}

async function unsubscribeUser(subscription: PushSubscription) {
  await Promise.all([
    removeSubscriptionFromBackend(subscription),
    subscription.unsubscribe(),
  ]);
}

async function subscribeUser() {
  const registration = await getRegistration();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
  await addSubscriptionToBackend(subscription);
}

async function toggleSubscription() {
  const state = await getState();
  if (state.subscription) {
    await unsubscribeUser(state.subscription);
  } else {
    await subscribeUser();
  }
}

async function updateUI() {
  const state = await getState();
  if (!state.isSupported) {
    pushStatus.textContent = '[Not Supported]';
    pushToggle.setAttribute('disabled', 'true');
  } else if (state.permissionBlocked) {
    pushStatus.textContent = '[Notification Permission Blocked]';
    pushToggle.setAttribute('disabled', 'true');
  } else {
    pushToggle.removeAttribute('disabled');
    pushToggle.checked = !!state.subscription;
  }
}

function start() {
  const toggleElement =
      document.querySelector('.push-component__toggle') as HTMLInputElement;
  const statusElement = document.querySelector('.push-component__status');

  if (!toggleElement) {
    throw new Error('Unable to find toggle element.');
  }
  if (!statusElement) {
    throw new Error('Unable to find status element.');
  }

  pushToggle = toggleElement;
  pushStatus = statusElement;

  pushToggle.addEventListener('change', async (event) => {
    event.preventDefault();
    pushToggle.setAttribute('disabled', 'true');
    await toggleSubscription();
    updateUI();
  });

  updateUI();
}

start();
