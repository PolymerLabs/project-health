import * as api from '../../../../types/api.js';

import {getAssignedIssues, getIncomingData, getLastKnownUpdate, getOutgoingData} from './utils/get-data.js';
import {newlyActionableIssues} from './utils/newly-actionable-issues.js';
import {newlyActionablePrs} from './utils/newly-actionable-prs.js';

class DashData {
  // This is the latest data received from the server and rendered to the page
  private lastPolledOutgoing: api.OutgoingDashResponse|null;
  private lastPolledIncoming: api.IncomingDashResponse|null;
  private lastPolledIssues: api.IssuesResponse|null;

  // This is the data that the user view the last time they were on the page
  private lastViewedOutgoing: api.OutgoingDashResponse|null;
  private lastViewedIncoming: api.IncomingDashResponse|null;
  private lastViewedIssues: api.IssuesResponse|null;

  private lastUpdateFailed: boolean;
  private lastKnownVersion: string|null;

  constructor() {
    this.lastPolledOutgoing = null;
    this.lastPolledIncoming = null;
    this.lastPolledIssues = null;

    this.lastViewedOutgoing = null;
    this.lastViewedIncoming = null;
    this.lastViewedIssues = null;

    this.lastKnownVersion = null;
    this.lastUpdateFailed = false;
  }

  async updateData() {
    try {
      // Execute these requests in parallel.
      const results = await Promise.all([
        getOutgoingData(),
        getIncomingData(),
        getAssignedIssues(),
      ]);

      this.lastUpdateFailed = false;

      this.lastPolledOutgoing = results[0];
      this.lastPolledIncoming = results[1];
      this.lastPolledIssues = results[2];
    } catch (err) {
      this.lastUpdateFailed = true;
    }
  }

  async markDataViewed() {
    this.lastViewedOutgoing = this.lastPolledOutgoing;
    this.lastViewedIncoming = this.lastPolledIncoming;
    this.lastViewedIssues = this.lastPolledIssues;
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

  getIssues(): api.Issue[] {
    if (!this.lastPolledIssues) {
      return [];
    }

    return this.lastPolledIssues.issues;
  }

  getIssueUpdates(): string[] {
    if (!this.lastPolledIssues) {
      return [];
    }

    if (!this.lastViewedIssues) {
      return [];
    }

    const newIssues = this.lastPolledIssues.issues;
    const oldIssues = this.lastViewedIssues.issues;

    return newlyActionableIssues(newIssues, oldIssues);
  }

  async areServerUpdatesAvailable(): Promise<boolean> {
    try {
      const response = await getLastKnownUpdate();

      this.lastUpdateFailed = false;

      if (response.version && this.lastKnownVersion) {
        if (response.version !== this.lastKnownVersion) {
          window.location.reload();
        }
      }

      this.lastKnownVersion = response.version;

      if (!response.lastKnownUpdate || !this.lastPolledIncoming) {
        return false;
      }

      const lastKnownUpdate = new Date(response.lastKnownUpdate);
      const lastDashUpdate = new Date(this.lastPolledIncoming.timestamp);
      return (lastKnownUpdate > lastDashUpdate);
    } catch (err) {
      this.lastUpdateFailed = true;
      return false;
    }
  }

  didUpdatesError(): boolean {
    return this.lastUpdateFailed;
  }
}

export const dashData = new DashData();
