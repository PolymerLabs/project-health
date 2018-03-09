import * as api from '../../../../types/api.js';
import {getIncomingData, getLastKnownUpdate, getOutgoingData} from './utils/get-data.js';
import {newlyActionablePrs} from './utils/newly-actionable-prs.js';

class DashData {
  // This is the latest data received from the server and rendered to the page
  private lastPolledOutgoing: api.OutgoingDashResponse|null;
  private lastPolledIncoming: api.IncomingDashResponse|null;
  // This is the data that the user view the last time they were on the page
  private lastViewedOutgoing: api.OutgoingDashResponse|null;
  private lastViewedIncoming: api.IncomingDashResponse|null;

  constructor() {
    this.lastPolledOutgoing = null;
    this.lastPolledIncoming = null;
    this.lastViewedOutgoing = null;
    this.lastViewedIncoming = null;
  }

  async updateData() {
    // Execute these requests in parallel.
    const results = await Promise.all([
      getOutgoingData(),
      getIncomingData(),
    ]);

    this.lastPolledOutgoing = results[0];
    this.lastPolledIncoming = results[1];

    this.updateState();
  }

  async updateState() {
    if (document.hasFocus()) {
      this.lastViewedOutgoing = this.lastPolledOutgoing;
      this.lastViewedIncoming = this.lastPolledIncoming;
    }
  }

  getProfileData(): api.DashboardUser|null {
    if (!this.lastPolledOutgoing) {
      return null;
    }

    return this.lastPolledOutgoing.user;
  }

  getOutgoingPrs(): api.OutgoingPullRequest[] {
    if (!this.lastPolledOutgoing) {
      return [];
    }

    return this.lastPolledOutgoing.prs;
  }

  getOutgoingUpdates(): string[] {
    if (!this.lastPolledOutgoing) {
      return [];
    }

    if (!this.lastViewedOutgoing) {
      return [];
    }

    const newPRs = this.lastPolledOutgoing.prs;
    const oldPRs = this.lastViewedOutgoing.prs;

    return newlyActionablePrs(newPRs, oldPRs);
  }

  getIncomingUpdates(): string[] {
    if (!this.lastPolledIncoming) {
      return [];
    }

    if (!this.lastViewedIncoming) {
      return [];
    }

    const newPRs = this.lastPolledIncoming.prs;
    const oldPRs = this.lastViewedIncoming.prs;

    return newlyActionablePrs(newPRs, oldPRs);
  }

  getIncomingPrs(): api.PullRequest[] {
    if (!this.lastPolledIncoming) {
      return [];
    }

    return this.lastPolledIncoming.prs;
  }

  async areServerUpdatesAvailable(): Promise<boolean> {
    const response = await getLastKnownUpdate();
    if (!response.lastKnownUpdate || !this.lastPolledIncoming) {
      return false;
    }

    const lastKnownUpdate = new Date(response.lastKnownUpdate);
    const lastDashUpdate = new Date(this.lastPolledIncoming.timestamp);
    return (lastKnownUpdate > lastDashUpdate);
  }
}

export const dashData = new DashData();
