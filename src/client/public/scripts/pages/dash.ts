import '../components/push-toggle.js';
import '../components/filter-legend.js';
import '../dash/push-controller.js';

import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {BaseElement} from '../components/base-element.js';
import {FilterLegendEvent} from '../components/filter-legend.js';
import {dashData} from '../dash/dash-data.js';
import {DashPollController} from '../dash/dash-poll-controller.js';
import {filterController, FilterId} from '../dash/filter-controller.js';
import {genericIssueListTemplate} from '../dash/issues.js';
import {notificationCenter} from '../dash/notification-center.js';
import {genericPrListTemplate, outgoingPrListTemplate} from '../dash/prs.js';
import {getLoginParam} from '../dash/utils/get-data.js';

// Full update - poll every 5 minutes
const FULL_UPDATE_ID = 'full-update';
const LONG_POLL_INTERVAL = 5 * 60 * 1000;
// Check server updates - poll every 15 seconds
const CHECK_SERVER_ID = 'check-server-updates';
const SHORT_POLL_INTERVAL = 15 * 1000;

const updateController = new DashPollController();

async function checkServerForUpdates() {
  const updatesAvailable = await dashData.areServerUpdatesAvailable();

  await notificationCenter.updateState(false);

  if (updatesAvailable) {
    console.log('[Server has Updates]');
    updateController.triggerPoll(FULL_UPDATE_ID);
  }
}

/**
 * Handler for when the document is focused.
 */
async function documentFocused() {
  updateApplicationState(true);
}

window.addEventListener('focus', documentFocused);

async function updateApplicationState(focused?: boolean) {
  console.log('[Update Application State]');

  // Ensure its a boolean.
  focused = focused ? true : false;

  await notificationCenter.updateState(focused);

  // TODO: This should be removed.
  if (focused) {
    await dashData.markDataViewed();
  }
}

function onMessage(event: ServiceWorkerMessageEvent|MessageEvent) {
  if (!event.data || !event.data.action) {
    return;
  }

  console.log(`[Message Received] Action: '${event.data.action}'`);
  if (event.data.action === 'push-received') {
    updateController.triggerPoll(FULL_UPDATE_ID);
  }
}

/**
 * User dashboard page with pull requests and issues.
 */
class DashPage extends BaseElement {
  private filters = {
    'outgoing-prs': [
      {type: 'complete', description: 'Ready to merge'},
      {type: 'actionable', description: 'Requires attention'},
      {type: 'activity', description: 'New activity'},
    ],
    'incoming-prs':
        [
          {type: 'actionable', description: 'Requires attention'},
          {type: 'activity', description: 'New activity'},
        ],
    'assigned-issues':
        [
          {type: 'actionable', description: 'Assigned to you'},
        ],
    'issue-activity':
        [
          {type: 'actionable', description: 'Unread'},
          {type: 'passive', description: 'Read', selected: false},
        ]
  };

  constructor() {
    super();
    this._createFilters();

    document.body.addEventListener(
        'render-outgoing-request', this.requestRender.bind(this));

    // Setup polling if we aren't emulating a different user.
    if (getLoginParam() === null) {
      updateController.startPoll(
          FULL_UPDATE_ID,
          this.performFullUpdate.bind(this),
          LONG_POLL_INTERVAL,
      );
      updateController.startPoll(
          CHECK_SERVER_ID,
          checkServerForUpdates,
          SHORT_POLL_INTERVAL,
      );

      if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener(
            'message', (event) => onMessage(event));
      }
    }
  }

  async connectedCallback() {
    await this.performFullUpdate();
  }

  async performFullUpdate() {
    console.log('[Performing Full Update]');
    await dashData.updateData();
    this.requestRender();
    await updateApplicationState();
  }

  _createFilters() {
    filterController.createFilter('outgoing-prs', this.filters['outgoing-prs']);
    filterController.createFilter('incoming-prs', this.filters['incoming-prs']);
    filterController.createFilter(
        'assigned-issues', this.filters['assigned-issues']);
    filterController.createFilter(
        'issue-activity', this.filters['issue-activity']);
  }

  _updateFilter(id: FilterId, event: CustomEvent<FilterLegendEvent>) {
    filterController.updateFilter(id, event.detail.state);
    this.requestRender();
  }

  // TODO: Render should be called as soon as we have any data, so the view is
  // incrementally updated. Currently we wait for all the data before rendering.
  render() {
    const user = dashData.getProfileData();

    return html`
<div class="title-container">
  <h1 id="page-header">${user && user.login}</h1>
  <push-toggle></push-toggle>
</div>
<div id="outgoing-prs">
  <h2>
    Outgoing pull requests
    <filter-legend on-legend-change="${
        this._updateFilter.bind(this, 'outgoing-prs')}" filters="${
        this.filters['outgoing-prs']}"></filter-legend>
  </h2>
  <div class="outgoing-prs__list pr-list">
    ${
        outgoingPrListTemplate(
            dashData.getOutgoingPrs(),
            filterController.getFilter('outgoing-prs'),
            'No outgoing pull requests',
            'When you open new pull requests, they\'ll appear here.',
            dashData.getOutgoingInfo())}
  </div>
</div>
<div id="incoming-prs">
  <h2>
    Incoming pull requests
    <filter-legend on-legend-change="${
        this._updateFilter.bind(this, 'incoming-prs')}" filters="${
        this.filters['incoming-prs']}"></filter-legend>
  </h2>
  <div class="incoming-prs__list pr-list">
    ${
        genericPrListTemplate(
            dashData.getIncomingPrs(),
            filterController.getFilter('incoming-prs'),
            'No incoming pull requests',
            'When you\'re added as a reviewer to a pull request, they\'ll appear here.')}
  </div>
</div>
<div id="assigned-issues">
  <h2>
    Your Issues
    <filter-legend on-legend-change="${
        this._updateFilter.bind(this, 'assigned-issues')}" filters="${
        this.filters['assigned-issues']}"></filter-legend>
  </h2>
  <div class="assigned-issues__list pr-list">
    ${
        genericIssueListTemplate(
            dashData.getAssignedIssues(),
            filterController.getFilter('assigned-issues'),
            'No issues assigned to you',
            'When you\'re assigned issues, they\'ll appear here.')}
  </div>
</div>
<div id="issue-activity">
  <h2>
    Your Issue Activity
    <filter-legend on-legend-change="${
        this._updateFilter.bind(this, 'issue-activity')}" filters="${
        this.filters['issue-activity']}"></filter-legend>
  </h2>
  <div class="issue-activity__list pr-list">
    ${
        genericIssueListTemplate(
            dashData.getIssueActivity(),
            filterController.getFilter('issue-activity'),
            'No open issues involving you',
            'When you\'re involved in issues, they\'ll appear here.')}
  </div>
</div>

<footer>Bug? Feedback? File an
  <a target="_blank" href="https://github.com/polymerlabs/project-health/issues/new">issue on GitHub</a>
</footer>
    `;
  }
}

customElements.define('dash-page', DashPage);
