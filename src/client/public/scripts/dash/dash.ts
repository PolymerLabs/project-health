import {render} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api.js';
import {prListTemplate, profileTemplate, statusToDisplay} from './prs.js';

// Poll every 5 minutes
const LONG_POLL_INTERVAL = 5 * 60 * 1000;
// Poll every 15 seconds
const SHORT_POLL_INTERVAL = 15 * 1000;
// Wait 1 hour before showing local notification if updates have occured.
const ACTIVITY_UPDATE_DURATION = 1 * 60 * 60 * 1000;

const NO_OUTGOING_PRS_MESSAGE =
    'You have no outgoing pull requests. When you open new pull requests, they\'ll appear here';
const NO_INCOMING_PRS_MESSAGE =
    '🎉 No incoming pull requests! When you\'re added as a reviewer to a pull request, it\'ll appear here.';

// This is the latest data received from the server and rendered to the page
let lastPolledIncoming: api.IncomingDashResponse|undefined;
let lastPolledOutgoing: api.OutgoingDashResponse|undefined;
// This is the data that the user view the last time they were on the page
let lastViewedOutgoing: api.OutgoingDashResponse|undefined;
let lastViewedIncoming: api.IncomingDashResponse|undefined;
// The timestamp of users machine when they last viewed the dashboard
let lastActivityUpdateTimestamp: number = Date.now();

let longPollTimeoutId: number;
let shortPollTimeoutId: number;


function renderOutgoing(
    data: api.OutgoingDashResponse, newlyActionablePRs: string[]) {
  const profileContainerElement =
      (document.querySelector('#profile-container') as Element);
  render(profileTemplate(data.user), profileContainerElement);
  if (data.user.isCurrentUser) {
    profileContainerElement.classList.remove('incognito');
  } else {
    profileContainerElement.classList.add('incognito');
  }
  render(
      prListTemplate(data.prs, newlyActionablePRs, NO_OUTGOING_PRS_MESSAGE),
      (document.querySelector('#outgoing') as Element));
}

function renderIncoming(
    data: api.IncomingDashResponse, newlyActionablePRs: string[]) {
  render(
      prListTemplate(data.prs, newlyActionablePRs, NO_INCOMING_PRS_MESSAGE),
      (document.querySelector('#incoming') as Element));
}


function newActions(
    newList: api.PullRequest[], oldList: api.PullRequest[]): string[] {
  const result = [];
  const oldActionablePRs: {[prUrl: string]: api.PullRequest} = {};
  oldList.forEach((pr: api.PullRequest) => {
    const {actionable} = statusToDisplay(pr);
    if (!actionable) {
      return;
    }

    oldActionablePRs[pr.url] = pr;
  });

  for (const newPr of newList) {
    const {actionable} = statusToDisplay(newPr);
    if (!actionable) {
      continue;
    }

    const oldPr = oldActionablePRs[newPr.url];
    if (!oldPr) {
      // New list has an actionable PR that didn't exist before
      result.push(newPr.url);
    }

    if (JSON.stringify(newPr) !== JSON.stringify(oldPr)) {
      result.push(newPr.url);
    }
  }
  return result;
}

async function fetchAndRender(userLogin: string|null): Promise<boolean> {
  // This allows you to see another users dashboard.
  const loginParams = userLogin ? `?login=${userLogin}` : '';
  // Execute these requests in parallel.
  const results = await Promise.all(
      [getAndRenderOutgoing(loginParams), getAndRenderIncoming(loginParams)]);

  lastPolledOutgoing = results[0].data;
  lastPolledIncoming = results[1].data;

  if (document.hasFocus()) {
    lastViewedOutgoing = results[0].data;
    lastViewedIncoming = results[1].data;
    lastActivityUpdateTimestamp = Date.now();
  }

  return results[0].actionable.length + results[1].actionable.length > 0;
}

async function getAndRenderOutgoing(loginParams: string) {
  const response =
      await fetch(`/api/dash/outgoing${loginParams}`, {credentials: 'include'});
  const data = await response.json() as api.OutgoingDashResponse;

  const actionable =
      lastViewedOutgoing ? newActions(data.prs, lastViewedOutgoing.prs) : [];
  renderOutgoing(data, actionable);
  return {data, actionable};
}

async function getAndRenderIncoming(loginParams: string) {
  const response =
      await fetch(`/api/dash/incoming${loginParams}`, {credentials: 'include'});
  const data = await response.json() as api.IncomingDashResponse;

  const actionable =
      lastViewedIncoming ? newActions(data.prs, lastViewedIncoming.prs) : [];
  renderIncoming(data, actionable);
  return {data, actionable};
}

function changeFavIcon(hasAction: boolean) {
  const iconElements =
      (document.querySelectorAll('link[rel=icon]') as
       NodeListOf<HTMLLinkElement>);
  for (let i = 0; i < iconElements.length; i++) {
    const iconElement = iconElements.item(i);
    const size = iconElement.href.indexOf('32x32') === -1 ? 16 : 32;
    const actionString = hasAction ? 'action-' : '';
    iconElement.href = `/images/favicon-${actionString}${size}x${size}.png`;
  }
}

async function updateDashboard(userLogin: string|null) {
  if (longPollTimeoutId) {
    window.clearTimeout(longPollTimeoutId);
  }

  try {
    const hasActionable = await fetchAndRender(userLogin);

    if (hasActionable && document.hasFocus() === false) {
      changeFavIcon(true);
    } else {
      changeFavIcon(false);
    }

    // Check if the user should be updated via notification
    await checkActivity(hasActionable);
  } catch (err) {
    console.log('Unable to perform long poll update: ', err);
  }

  longPollTimeoutId = window.setTimeout(() => {
    updateDashboard(userLogin);
  }, LONG_POLL_INTERVAL);
}

async function performShortPollAction(userLogin: string|null) {
  const loginParams = userLogin ? `?login=${userLogin}` : '';
  const response = await fetch(`/api/updates/last-known.json${loginParams}`, {
    credentials: 'include',
  });
  const details =
      (await response.json()) as api.JSONAPIResponse<api.LastKnownResponse>;
  if (details.error) {
    console.error(`Unable to get last known update: ${details.error.message}`);
    return;
  }

  if (!details.data) {
    throw new Error('No data provided by JSON API.');
  }

  if (!details.data.lastKnownUpdate) {
    return;
  }

  if (!lastPolledIncoming || !lastPolledOutgoing) {
    return;
  }

  const lastKnownUpdate = new Date(details.data.lastKnownUpdate);
  const lastDashUpdate = new Date(lastPolledIncoming.timestamp);
  if (lastKnownUpdate > lastDashUpdate) {
    await updateDashboard(userLogin);
  }
}

async function hasPushEnabled() {
  if ('permissions' in navigator) {
    // tslint:disable-next-line:no-any
    const permissionsAPI = (navigator as any)['permissions'];
    const result = await permissionsAPI.query({
      name: 'push',
      userVisibleOnly: true,
    });
    return result.state === 'granted';
  }

  return false;
}

async function checkActivity(hasActionable: boolean) {
  if (lastActivityUpdateTimestamp > Date.now() - ACTIVITY_UPDATE_DURATION) {
    return;
  }

  // Reset the timestamp to wait a new hour before showing notification
  lastActivityUpdateTimestamp = Date.now();
  if (!await hasPushEnabled()) {
    return;
  }

  if (!hasActionable) {
    return;
  }

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    return;
  }

  if (!lastPolledOutgoing || !lastViewedOutgoing || !lastPolledIncoming ||
      !lastViewedIncoming) {
    return;
  }

  const actionableOutgoing =
      newActions(lastPolledOutgoing.prs, lastViewedOutgoing.prs);
  const actionableIncoming =
      newActions(lastPolledIncoming.prs, lastViewedIncoming.prs);

  const bodyMessages = [];
  if (actionableOutgoing.length > 0) {
    bodyMessages.push(`${actionableOutgoing.length} outgoing PRs`);
  }
  if (actionableIncoming.length > 0) {
    bodyMessages.push(`${actionableIncoming.length} incoming PRs`);
  }

  const options = {
    body: `${bodyMessages.join(' and ')} require your attention`,
    icon: '/images/notification-images/icon-192x192.png',
    data: {
      url: window.location.href,
    },
    requiresInteraction: false,
    tag: 'project-health-new-activity'
    // tslint:disable-next-line:no-any
  } as any;
  reg.showNotification(
      `New activity on ${
          actionableOutgoing.length + actionableIncoming.length} PRs`,
      options);
}

async function performShortPoll(userLogin: string|null) {
  if (shortPollTimeoutId) {
    window.clearTimeout(shortPollTimeoutId);
  }

  try {
    await performShortPollAction(userLogin);
  } catch (err) {
    console.log('Unable to perform short poll update: ', err);
  }

  shortPollTimeoutId = window.setTimeout(() => {
    performShortPoll(userLogin);
  }, SHORT_POLL_INTERVAL);
}

async function startPolling(userLogin: string|null) {
  await updateDashboard(userLogin);
  await performShortPoll(userLogin);
}

async function start() {
  // This allows you to see another users dashboard.
  const queryParams = new URLSearchParams(window.location.search);
  const userLogin = queryParams.get('login');

  window.addEventListener('focus', () => {
    // This will reset the favicon when the user revisits the page
    changeFavIcon(false);

    lastViewedIncoming = lastPolledIncoming;
    lastViewedOutgoing = lastPolledOutgoing;
    lastActivityUpdateTimestamp = Date.now();

    // When an element is marked as 'is-newly-actionable' we need to apply the
    // flash keyframe animation (achieved by adding the 'actionable-flash'
    // class).
    // To reliably do this, ensure the class is removed, wait for an animation
    // frame to ensure the class is up to date, then apply the flash.
    const elements = document.querySelectorAll('.is-newly-actionable');
    for (let i = 0; i < elements.length; i++) {
      const element = elements.item(i) as HTMLElement;
      element.classList.remove('actionable-flash');
      // tslint:disable-next-line:no-unused-expression
      element.offsetTop;  // Force a style recalc
      element.classList.remove('is-newly-actionable');
      element.classList.add('actionable-flash');
    }
  });

  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (!event.data || !event.data.action) {
        return;
      }

      const swMessage = event.data;
      if (swMessage.action === 'push-received') {
        updateDashboard(userLogin);
      }
    });
  }

  startPolling(userLogin);
}

start();
