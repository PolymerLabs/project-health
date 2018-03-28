import {applicationServerKey} from './application-server-key.js';
import {addSubscriptionToBackend, removeSubscriptionFromBackend} from './push-backend.js';

interface PushComponentState {
  isSupported: boolean;
  permissionBlocked: boolean;
  savedToBackend: boolean;
  subscription: PushSubscription|null;
}

class PushComponent {
  private pushToggle: HTMLInputElement;
  private pushStatus: Element;
  private pushText: Element;
  private state: PushComponentState;

  constructor() {
    const toggleElement = document.querySelector(
                              '.js-push-component__toggle') as HTMLInputElement;
    const statusElement = document.querySelector('.push-component__status');
    const textElement = document.querySelector('.push-component__text');

    if (!toggleElement) {
      throw new Error('Unable to find toggle element.');
    }
    if (!statusElement) {
      throw new Error('Unable to find status element.');
    }
    if (!textElement) {
      throw new Error('Unable to find text element.');
    }

    this.pushToggle = toggleElement;
    this.pushStatus = statusElement;
    this.pushText = textElement;
    this.state = {
      isSupported: (navigator.serviceWorker && ('PushManager' in window)),
      permissionBlocked: false,
      savedToBackend: false,
      subscription: null,
    };

    this.pushToggle.addEventListener('change', async (event) => {
      event.preventDefault();
      this.pushToggle.setAttribute('disabled', 'true');

      if (this.pushToggle.checked) {
        await this.setupPush();
      } else {
        await this.disablePush();
      }
    });
  }

  async update() {
    // Setup state
    try {
      await Promise.all([
        this.updatePermissionState(),
        this.updateSubscriptionState(),
      ]);

      if (!this.state.isSupported) {
        this.pushStatus.textContent = '[Not Supported]';
        this.pushToggle.setAttribute('disabled', 'true');
      } else if (this.state.permissionBlocked) {
        this.pushStatus.textContent = '[Notification Permission Blocked]';
        this.pushToggle.setAttribute('disabled', 'true');
      } else {
        this.pushToggle.removeAttribute('disabled');
        this.pushToggle.checked =
            !!(this.state.subscription && this.state.savedToBackend);
        if (this.pushToggle.checked) {
          this.pushText.textContent =
              'Push notifications are enabled. Toggle to no longer receive push notifications on this device.';
        } else {
          this.pushText.textContent =
              'Push notifications are disabled. Toggle to receive push notifications on this device.';
        }
      }

    } catch (err) {
      this.pushToggle.setAttribute('disabled', 'true');
      this.pushStatus.textContent = '[Unable to Setup Notifications]';
    }
  }

  async updatePermissionState() {
    const permissionState =
        // tslint:disable-next-line:no-any
        await (navigator as any).permissions.query({name: 'notifications'});
    this.state.permissionBlocked = permissionState.state === 'denied';
  }

  async updateSubscriptionState() {
    const registration = await this.getRegistration();
    this.state.subscription = await registration.pushManager.getSubscription();

    // Make sure it's saved on the backend
    this.state.savedToBackend = false;
    if (this.state.subscription) {
      await addSubscriptionToBackend(this.state.subscription);
      this.state.savedToBackend = true;
    }
  }

  getRegistration() {
    return navigator.serviceWorker.register('/sw.js');
  }

  async setupPush() {
    const registration = await this.getRegistration();
    await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    await this.update();
    await registration.showNotification(
        'You\'ll get notifications for important events', {
          icon: '/images/notification-images/icon-192x192.png',
          badge: '/images/notification-images/badge-128x128.png',
          requiresInteraction: true,
          tag: 'training-notification',
          // tslint:disable-next-line:no-any
        } as any);
  }

  async disablePush() {
    const registration = await this.getRegistration();
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return;
    }

    await Promise.all([
      subscription.unsubscribe(),
      removeSubscriptionFromBackend(subscription),
    ]);

    await this.update();
  }
}

const pushComponent = new PushComponent();
pushComponent.update();
