import {ToggleElement} from '../components/toggle-element.js';

import {applicationServerKey} from './application-server-key.js';
import {addSubscriptionToBackend, removeSubscriptionFromBackend} from './push-backend.js';

interface PushState {
  isSupported: boolean;
  permissionBlocked: boolean;
  savedToBackend: boolean;
  subscription: PushSubscription|null;
}

class PushController {
  private toggleElement: ToggleElement;
  private state: PushState;

  constructor() {
    this.toggleElement =
        (document.querySelector('#push-toggle') as ToggleElement);
    if (!this.toggleElement) {
      throw new Error('Unable to find toggle element.');
    }

    this.toggleElement.details = {
      label: 'Push Notifications',
      selectedImg: '/images/notifications-active.svg',
      deselectedImg: '/images/notifications-off.svg',
    };

    this.state = {
      isSupported: (navigator.serviceWorker && ('PushManager' in window)),
      permissionBlocked: false,
      savedToBackend: false,
      subscription: null,
    };

    this.toggleElement.addEventListener('change', async (event) => {
      event.preventDefault();
      this.toggleElement.setAttribute('disabled', 'true');

      if (this.toggleElement.selected) {
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
        this.toggleElement.setAttribute('disabled', 'true');
      } else if (this.state.permissionBlocked) {
        this.toggleElement.setAttribute('disabled', 'true');
      } else {
        this.toggleElement.removeAttribute('disabled');
        this.toggleElement.selected =
            !!(this.state.subscription && this.state.savedToBackend);
      }
    } catch (err) {
      this.toggleElement.setAttribute('disabled', 'true');
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

const pushComponent = new PushController();
pushComponent.update();
