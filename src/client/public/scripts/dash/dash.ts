import '../components/nav-element.js';
import '../components/toggle-element.js';
import '../components/filter-legend.js';
import './push-controller.js';

import {render} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {FilterLegend, FilterLegendItem} from '../components/filter-legend.js';
import {NavElement} from '../components/nav-element.js';

import {dashData} from './dash-data.js';
import {DashPollController} from './dash-poll-controller.js';
import {FilterController, FilterId, FilterState} from './filter-controller.js';
import {genericIssueListTemplate} from './issues.js';
import {notificationCenter} from './notification-center.js';
import {genericPrListTemplate, outgoingPrListTemplate} from './prs.js';
import {getLoginParam} from './utils/get-data.js';

// Full update - poll every 5 minutes
const FULL_UPDATE_ID = 'full-update';
const LONG_POLL_INTERVAL = 5 * 60 * 1000;
// Check server updates - poll every 15 seconds
const CHECK_SERVER_ID = 'check-server-updates';
const SHORT_POLL_INTERVAL = 15 * 1000;

const updateController = new DashPollController();
const filterController = new FilterController();

function renderUser() {
  const profileData = dashData.getProfileData();
  if (!profileData) {
    return;
  }

  const pageHeader = (document.querySelector('#page-header') as Element);
  pageHeader.textContent = profileData.login;

  const nav = (document.querySelector('nav-element') as NavElement);
  nav.user = profileData;
}

function renderOutgoing() {
  const outgoingPrs = dashData.getOutgoingPrs();
  if (!outgoingPrs) {
    return;
  }

  render(
      outgoingPrListTemplate(
          outgoingPrs,
          filterController.getFilter('outgoing-prs'),
          'No outgoing pull requests',
          'When you open new pull requests, they\'ll appear here.'),
      (document.querySelector('.outgoing-prs__list') as Element));
}

function renderIncoming() {
  const incomingPrs = dashData.getIncomingPrs();
  if (!incomingPrs) {
    return;
  }

  render(
      genericPrListTemplate(
          incomingPrs,
          filterController.getFilter('incoming-prs'),
          'No incoming pull requests',
          'When you\'re added as a reviewer to a pull request, they\'ll appear here.'),
      (document.querySelector('.incoming-prs__list') as Element));
}

async function renderAssignedIssues() {
  const issues = await dashData.getAssignedIssues();

  render(
      genericIssueListTemplate(
          issues,
          filterController.getFilter('assigned-issues'),
          'No issues assigned to you',
          'When you\'re assigned issues, they\'ll appear here.'),
      (document.querySelector('.assigned-issues__list') as Element));
}

async function renderIssueActivity() {
  const issues = await dashData.getIssueActivity();

  render(
      genericIssueListTemplate(
          issues,
          filterController.getFilter('issue-activity'),
          'No open issues involving you',
          'When you\'re involved in issues, they\'ll appear here.'),
      (document.querySelector('.issue-activity__list') as Element));
}

function renderAll() {
  renderUser();
  renderOutgoing();
  renderIncoming();
  renderAssignedIssues();
  renderIssueActivity();
}

async function performFullUpdate() {
  console.log('[Performing Full Update]');
  await dashData.updateData();
  renderAll();
  await updateApplicationState();
}

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

async function updateApplicationState(focused?: boolean) {
  console.log('[Update Application State]');

  // Ensure its a boolean.
  focused = focused ? true : false;

  await notificationCenter.updateState(focused);

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
  } else if (event.data.action === 'render-outgoing-request') {
    renderOutgoing();
  }
}

async function start() {
  // Render persistent UI.
  const outgoingFilters: FilterLegendItem[] = [
    {type: 'complete', description: 'Ready to merge'},
    {type: 'actionable', description: 'Requires attention'},
    {type: 'activity', description: 'New activity'},
  ];
  const incomingFilters: FilterLegendItem[] = [
    {type: 'actionable', description: 'Requires attention'},
    {type: 'activity', description: 'New activity'},
  ];
  const assignedFilters: FilterLegendItem[] = [
    {type: 'actionable', description: 'Assigned to you'},
  ];
  const issueActivityFilters: FilterLegendItem[] = [
    {type: 'actionable', description: 'Unread'},
    {type: 'passive', description: 'Read', selected: false},
  ];

  const outgoingLegendElement =
      document.querySelector('.outgoing-legend') as FilterLegend;
  outgoingLegendElement.filters = outgoingFilters;

  const incomingLegendElement =
      document.querySelector('.incoming-legend') as FilterLegend;
  incomingLegendElement.filters = incomingFilters;

  const assignedLegendElement =
      document.querySelector('.assigned-issues-legend') as FilterLegend;
  assignedLegendElement.filters = assignedFilters;

  const issueActivityLegend =
      document.querySelector('.issue-activity-legend') as FilterLegend;
  issueActivityLegend.filters = issueActivityFilters;

  filterController.createFilter('outgoing-prs', outgoingFilters);
  filterController.createFilter('incoming-prs', outgoingFilters);
  filterController.createFilter('assigned-issues', assignedFilters);
  filterController.createFilter('issue-activity', issueActivityFilters);

  /**
   * Event handler for when the filter is changed.
   */
  function filterChanged(id: FilterId, event: {detail: FilterState}) {
    filterController.updateFilter(id, event.detail);
    renderAll();
  }

  /**
   * Finds and attaches filter event listener.
   */
  function attachFilterListener(id: FilterId) {
    const element = document.getElementById(id);
    if (!element) {
      throw Error('Could not attach filter event listener');
    }
    element.addEventListener('legend-change', filterChanged.bind(null, id));
  }

  attachFilterListener('incoming-prs');
  attachFilterListener('outgoing-prs');
  attachFilterListener('assigned-issues');
  attachFilterListener('issue-activity');

  // Initialise the dashbaord with data
  await performFullUpdate();

  // Setup polling if we aren't emulating a different user.
  if (getLoginParam() === null) {
    updateController.startPoll(
        FULL_UPDATE_ID,
        performFullUpdate,
        LONG_POLL_INTERVAL,
    );
    updateController.startPoll(
        CHECK_SERVER_ID,
        checkServerForUpdates,
        SHORT_POLL_INTERVAL,
    );
  } else {
    console.log('Polling disabled due to login parameter being used.');
  }

  // Setup events
  window.addEventListener('focus', documentFocused);
  window.addEventListener('message', onMessage);
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener(
        'message', (event) => onMessage(event));
  }
}

start();
