import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {applicationServerKey} from '../dash/application-server-key.js';
import {addSubscriptionToBackend, removeSubscriptionFromBackend} from '../dash/push-backend.js';

import {BaseElement, property} from './base-element.js';

interface PushState {
  isSupported: boolean;
  permissionBlocked: boolean;
  savedToBackend: boolean;
  subscription: PushSubscription|null;
}

export class PushToggle extends BaseElement {
  @property() disabled = true;
  @property() private selected = false;
  private state: PushState;

  constructor() {
    super();

    this.state = {
      isSupported: (navigator.serviceWorker && ('PushManager' in window)),
      permissionBlocked: false,
      savedToBackend: false,
      subscription: null,
    };
  }

  async connectedCallback() {
    this.addEventListener('click', this.toggle.bind(this));
    await this.update();
  }

  private async updatePermissionState() {
    const permissionState =
        // tslint:disable-next-line:no-any
        await (navigator as any).permissions.query({name: 'notifications'});
    this.state.permissionBlocked = permissionState.state === 'denied';
  }

  private async updateSubscriptionState() {
    const registration = await this.getRegistration();
    this.state.subscription = await registration.pushManager.getSubscription();

    // Make sure it's saved on the backend
    this.state.savedToBackend = false;
    if (this.state.subscription) {
      await addSubscriptionToBackend(this.state.subscription);
      this.state.savedToBackend = true;
    }
  }

  private getRegistration() {
    return navigator.serviceWorker.register('/sw.js');
  }

  private async setupPush() {
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
        } as NotificationOptions);
  }

  private async disablePush() {
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

  private async update() {
    // Setup state
    try {
      await Promise.all([
        this.updatePermissionState(),
        this.updateSubscriptionState(),
      ]);

      if (!this.state.isSupported) {
        this.disabled = true;
      } else if (this.state.permissionBlocked) {
        this.disabled = true;
      } else {
        this.disabled = false;
        this.selected =
            !!(this.state.subscription && this.state.savedToBackend);
      }
    } catch (err) {
      this.disabled = true;
    }
  }

  async toggle() {
    if (this.disabled) {
      return;
    }

    this.selected = !this.selected;
    if (this.selected) {
      await this.setupPush();
    } else {
      await this.disablePush();
    }
  }

  render() {
    this.classList.toggle('disabled', this.disabled);
    this.classList.toggle('selected', this.selected);
    this.title = this.selected ?
        'Push notifications currently enabled. Tap to disable.' :
        'Push notifications currently disabled. Tap to enable.';

    return html`
      <i class="material-icons-extended empty-message__sun">
        ${this.selected ? 'notifications_active' : 'notifications_off'}
      </i>
    `;
  }
}

customElements.define('push-toggle', PushToggle);
