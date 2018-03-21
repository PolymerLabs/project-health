import {dashData} from './dash-data.js';
import {notifyUser} from './utils/notify-user.js';
import {updateFavIcon} from './utils/update-fav-icon.js';

// Update if an hour goes by with no user interaction
const ACTIVITY_UPDATE_DURATION = 1 * 60 * 60 * 1000;

class NotificationCenter {
  private userViewedOrUpdated: number;

  constructor() {
    this.userViewedOrUpdated = Date.now();
  }

  private async updateUser() {
    // Reset the timestamp to wait a new hour before showing notification
    this.userViewedOrUpdated = Date.now();

    const outgoingUpdates = dashData.getOutgoingUpdates();
    const incomingUpdates = dashData.getIncomingUpdates();

    const bodyMessages = [];
    if (outgoingUpdates.length > 0) {
      bodyMessages.push(`${outgoingUpdates.length} outgoing PRs`);
    }
    if (incomingUpdates.length > 0) {
      bodyMessages.push(`${incomingUpdates.length} incoming PRs`);
    }

    if (bodyMessages.length === 0) {
      return;
    }

    const totalUpdates = outgoingUpdates.length + incomingUpdates.length;
    const title = `New activity on ${totalUpdates} PRs`;
    const options = {
      body: `${bodyMessages.join(' and ')} require your attention`,
      data: {
        url: window.location.href,
      },
      requiresInteraction: false,
      tag: 'project-health-new-activity'
      // tslint:disable-next-line:no-any
    } as any;
    await notifyUser(title, options);
  }

  private shouldNotifyUser(): boolean {
    return (this.userViewedOrUpdated <= Date.now() - ACTIVITY_UPDATE_DURATION);
  }

  async updateState(focused: boolean) {
    const outgoingUpdates = dashData.getOutgoingUpdates();
    const incomingUpdates = dashData.getIncomingUpdates();
    const newActionableItems =
        outgoingUpdates.length > 0 || incomingUpdates.length > 0;

    if (dashData.didUpdatesError()) {
      updateFavIcon('error');
    } else {
      if (focused) {
        this.userViewedOrUpdated = Date.now();
        updateFavIcon(null);
      } else {
        updateFavIcon(newActionableItems ? 'actionable' : null);
      }
    }

    if (this.shouldNotifyUser()) {
      await this.updateUser();
    }
  }
}

export const notificationCenter = new NotificationCenter();
