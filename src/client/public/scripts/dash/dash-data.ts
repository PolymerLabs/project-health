import * as api from '../../../../types/api.js';

import {getAssignedIssues, getIncomingData, getIssueActivity, getLastKnownUpdate, getOutgoingData} from './utils/get-data.js';
import {newlyActionablePrs} from './utils/newly-actionable-prs.js';

class DashData {
  // This is the latest data received from the server and rendered to the page
  private lastPolledOutgoing: api.OutgoingDashResponse|null;
  private lastPolledIncoming: api.IncomingDashResponse|null;
  private lastPolledAssignedIssues: api.IssuesResponse|null;
  private lastPolledIssueActivity: api.IssuesResponse|null;

  // This is the data that the user view the last time they were on the page
  private lastViewedOutgoing: api.OutgoingDashResponse|null;
  private lastViewedIncoming: api.IncomingDashResponse|null;

  private lastUpdateFailed: boolean;
  private lastKnownVersion: string|null;

  constructor() {
    this.lastPolledOutgoing = null;
    this.lastPolledIncoming = null;
    this.lastPolledAssignedIssues = null;
    this.lastPolledIssueActivity = null;

    this.lastViewedOutgoing = null;
    this.lastViewedIncoming = null;

    this.lastKnownVersion = null;
    this.lastUpdateFailed = false;
  }

  async updateData() {
    this.lastUpdateFailed = false;

    const handleErr = (err: Error) => {
      this.lastUpdateFailed = true;
      console.warn(err);
      return null;
    };
    // Execute these requests in parallel.
    const results = await Promise.all([
      getOutgoingData().catch(handleErr),
      getIncomingData().catch(handleErr),
      getAssignedIssues().catch(handleErr),
      getIssueActivity().catch(handleErr),
    ]);

    this.lastPolledOutgoing = results[0];
    this.lastPolledIncoming = results[1];
    this.lastPolledAssignedIssues = results[2];
    this.lastPolledIssueActivity = results[3];
  }

  async markDataViewed() {
    this.lastViewedOutgoing = this.lastPolledOutgoing;
    this.lastViewedIncoming = this.lastPolledIncoming;
  }

  getProfileData(): api.DashboardUser|null {
    if (!this.lastPolledOutgoing) {
      return null;
    }

    return this.lastPolledOutgoing.user;
  }

  getOutgoingInfo(): api.OutgoingPullRequestInfo|null {
    if (!this.lastPolledOutgoing) {
      return null;
    }

    return this.lastPolledOutgoing;
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

  getAssignedIssues(): api.Issue[] {
    if (!this.lastPolledAssignedIssues) {
      return [];
    }

    return this.lastPolledAssignedIssues.issues;
  }

  getIssueActivity(): api.Issue[] {
    if (!this.lastPolledIssueActivity) {
      return [];
    }

    return this.lastPolledIssueActivity.issues;
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
