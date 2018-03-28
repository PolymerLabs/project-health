import {render} from '../../../../../node_modules/lit-html/lib/lit-extended.js';

import {dashData} from './dash-data.js';
import {DashPollController} from './dash-poll-controller.js';
import {genericIssueListTemplate} from './issues.js';
import {legendTemplate} from './legend.js';
import {notificationCenter} from './notification-center.js';
import {profileTemplate} from './profile.js';
import {genericPrListTemplate, outgoingPrListTemplate} from './prs.js';
import {getLoginParam} from './utils/get-data.js';

// Full update - poll every 5 minutes
const FULL_UPDATE_ID = 'full-update';
const LONG_POLL_INTERVAL = 5 * 60 * 1000;
// Check server updates - poll every 15 seconds
const CHECK_SERVER_ID = 'check-server-updates';
const SHORT_POLL_INTERVAL = 15 * 1000;

const updateController = new DashPollController();

function renderProfile() {
  const profileData = dashData.getProfileData();
  if (!profileData) {
    return;
  }

  const profileContainerElement =
      (document.querySelector('#profile-container') as Element);
  if (profileData.isCurrentUser) {
    profileContainerElement.classList.remove('incognito');
  } else {
    profileContainerElement.classList.add('incognito');
  }

  render(profileTemplate(profileData), profileContainerElement);
}

function renderOutgoing() {
  const outgoingPrs = dashData.getOutgoingPrs();
  if (!outgoingPrs) {
    return;
  }

  const actionableIds = dashData.getOutgoingUpdates();

  render(
      outgoingPrListTemplate(outgoingPrs, actionableIds, {
        title: 'No outgoing pull requests',
        description: 'When you open new pull requests, they\'ll appear here.'
      }),
      (document.querySelector('#outgoing') as Element));
}

function renderIncoming() {
  const incomingPrs = dashData.getIncomingPrs();
  if (!incomingPrs) {
    return;
  }

  const actionableIds = dashData.getIncomingUpdates();

  render(
      genericPrListTemplate(incomingPrs, actionableIds, {
        title: 'No incoming pull requests',
        description:
            'When you\'re added as a reviewer to a pull request, they\'ll appear here.'
      }),
      (document.querySelector('#incoming') as Element));
}

async function renderIssues() {
  const issues = await dashData.getIssues();

  const actionableIds = dashData.getIssueUpdates();
  render(
      genericIssueListTemplate(issues, actionableIds, {
        title: 'No issues assigned to you',
        description: 'When you\'re assigned issues, they\'ll appear here.'
      }),
      (document.querySelector('#your-issues') as Element));
}

async function performFullUpdate() {
  console.log('[Performing Full Update]');
  await dashData.updateData();

  renderProfile();
  renderOutgoing();
  renderIncoming();
  renderIssues();

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

    // When an element is marked as 'is-newly-actionable' we need to apply the
    // flash keyframe animation (achieved by adding the 'actionable-flash'
    // class).
    // To reliably do this, ensure the class is removed, force a style
    // recalc, then apply the flash.
    const elements = document.querySelectorAll('.is-newly-actionable');
    for (let i = 0; i < elements.length; i++) {
      const element = elements.item(i) as HTMLElement;
      element.classList.remove('actionable-flash');
      // tslint:disable-next-line:no-unused-expression
      element.offsetTop;  // Force a style recalc
      element.classList.remove('is-newly-actionable');
      element.classList.add('actionable-flash');
    }
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
  // Render persistent UI
  render(
      legendTemplate([
        {type: 'complete', description: 'Ready to merge'},
        {type: 'actionable', description: 'Requires attention'},
        {type: 'activity', description: 'New activity'},
      ]),
      document.querySelector('.outgoing-legend'));
  render(
      legendTemplate([
        {type: 'actionable', description: 'Requires attention'},
        {type: 'activity', description: 'New activity'},
      ]),
      document.querySelector('.incoming-legend'));
  render(
      legendTemplate([
        {type: 'actionable', description: 'Assigned to you'},
      ]),
      document.querySelector('.assigned-issues-legend'));

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
