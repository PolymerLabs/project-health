import {html, render} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api';
import {JSONAPIResponse, LastKnownResponse, PullRequest} from '../../../../types/api';

// Poll every 5 Minutes
const LONG_POLL_INTERVAL = 5 * 60 * 1000;
const SHORT_POLL_INTERVAL = 15 * 1000;

// This is the latest data received from the server and rendered to the page
let lastPolledData: api.DashResponse;
// This is the data that the user view the last time they were on the page
let lastViewedData: api.DashResponse;

let longPollTimeoutId: number;
let shortPollTimeoutId: number;

type EventDisplay = {
  time: number|null; text: string; url: string | null;
};

type StatusDisplay = {
  actionable: boolean; text: string;
};

const DEFAULT_AVATAR = '/images/default-avatar.svg';

const dashTmpl = (data: api.DashResponse, newlyActionablePRs: string[]) => {
  const imageUrl = data.user.avatarUrl ? data.user.avatarUrl : DEFAULT_AVATAR;
  const buttonTemplates = [];

  if (data.user.isCurrentUser) {
    buttonTemplates.push(
        html`<a href="/settings" title="Settings" class="settings"></a>`);
  }
  const prListTemplate =
      (prList: api.PullRequest[],
       newlyActionablePRs: string[],
       emptyMessage: string) => {
        if (prList.length) {
          return prList.map((pr) => prTemplate(pr, newlyActionablePRs));
        } else {
          return html
          `<div class="pr-list__empty-message">${emptyMessage}</div>`;
        }
      };

  return html`
  <div class="profile-container">
    <div class="profile-avatar"><img src="${imageUrl}" alt="Avatar of ${
      data.user.login}" /></div>
    <div class="profile-header">Welcome ${data.user.login}</div>
    <div class="profile-buttons">
      ${buttonTemplates}
    </div>
  </div>
  <div class="pr-list">
    <h2>Outgoing pull requests</h2>
    ${
      prListTemplate(
          data.outgoingPrs,
          newlyActionablePRs,
          'You have no outgoing pull requests. When you open new pull requests, they\'ll appear here')}
    <h2>Incoming pull requests</h2>
    ${
      prListTemplate(
          data.incomingPrs,
          newlyActionablePRs,
          '🎉 No incoming pull requests! When you\'re added as a reviewer to a pull request, it\'ll appear here.')}
  </div>
  `;
};

function renderDash(data: api.DashResponse, newlyActionablePRs: string[]) {
  render(
      dashTmpl(data, newlyActionablePRs),
      (document.querySelector('.dash-container') as Element));
}

function timeToString(dateTime: number) {
  let secondsSince = (Date.now() - dateTime) / 1000;
  let unit = 'seconds';
  if (secondsSince > 60) {
    secondsSince = secondsSince / 60;
    unit = 'minutes';

    if (secondsSince > 60) {
      secondsSince = secondsSince / 60;
      unit = 'hours';

      if (secondsSince > 24) {
        secondsSince = secondsSince / 24;
        unit = 'days';

        if (secondsSince > 365) {
          secondsSince = secondsSince / 365;
          unit = 'years';
        } else if (secondsSince > 30) {
          secondsSince = secondsSince / 30;
          unit = 'months';
        }
      }
    }
  }
  return `${(secondsSince).toFixed(0)} ${unit} ago`;
}

function reviewStateToString(state: api.Review['reviewState']) {
  if (state === 'APPROVED') {
    return 'approved changes';
  } else if (state === 'CHANGES_REQUESTED') {
    return 'requested changes';
  } else if (state === 'COMMENTED') {
    return 'reviewed with comments';
  } else if (state === 'DISMISSED') {
    return 'dismissed review';
  }
  return '';
}

function eventDisplay(event: api.PullRequestEvent): EventDisplay {
  switch (event.type) {
    case 'OutgoingReviewEvent':
      const authors = event.reviews.map((review) => review.author);
      const latest =
          Math.max(...event.reviews.map((review) => review.createdAt));
      let states = event.reviews.map((review) => review.reviewState);
      states =
          states.filter((value, index, self) => self.indexOf(value) === index);

      let text = '';
      if (states.length === 1) {
        text = `${authors.join(', ')} ${reviewStateToString(states[0])}`;
      } else {
        text += `${authors.join(', ')} reviewed changes`;
      }
      return {text, time: latest, url: null};
    case 'MyReviewEvent':
      return {
        text: `You ${reviewStateToString(event.review.reviewState)}`,
        time: event.review.createdAt,
        url: null,
      };
    case 'NewCommitsEvent':
      return {
        text: `${event.count} new commits +${event.additions} -${
            event.deletions}`,
        time: event.lastPushedAt,
        url: event.url,
      };
    case 'MentionedEvent':
      return {
        text: `You were @mentioned "${event.text}"`,
        time: event.mentionedAt,
        url: event.url
      };
    default:
      const unknown: never = event;
      throw new Error(`Unknown PullRequestEvent: ${unknown}`);
  }
}

function eventTemplate(event: api.PullRequestEvent) {
  const display = eventDisplay(event);

  const timeTemplate = (time: number) =>
      html`<time class="pr-event__time" datetime="${
          new Date(time).toISOString()}">${timeToString(time)}</time>`;

  const linkTemplate = (url: string, text: string) =>
      html`<a class="pr-event__url" href="${url}" target="_blank">${text}</a>`;

  return html`
    <div class="pr-event">
      ${display.time ? timeTemplate(display.time) : ''}

      <div class="pr-event__bullet">
        <svg width="40" height="100%">
          <circle cx="20.5" cy="6" r="4.5" />
        </svg>
      </div>
      <div class="pr-event__title">
        ${display.url ? linkTemplate(display.url, display.text) : display.text}
      </div>
    </div>`;
}

function statusToDisplay(pr: api.PullRequest): StatusDisplay {
  switch (pr.status.type) {
    case 'UnknownStatus':
      return {text: '', actionable: false};
    case 'NoActionRequired':
      return {text: 'No action required', actionable: false};
    case 'NewActivity':
      return {text: 'New activity', actionable: false};
    case 'StatusChecksPending':
      return {text: 'Status checks pending', actionable: false};
    case 'WaitingReview':
      return {
        text: `Waiting on ${pr.status.reviewers.join(', ')}`,
        actionable: false
      };
    case 'PendingChanges':
      return {text: 'Waiting on you', actionable: true};
    case 'PendingMerge':
      return {text: 'Ready to merge', actionable: true};
    case 'StatusChecksFailed':
      return {text: 'Status checks failed', actionable: true};
    case 'NoReviewers':
      return {text: 'No reviewers assigned', actionable: true};
    case 'ReviewRequired':
      return {text: 'Pending your review', actionable: true};
    case 'ApprovalRequired':
      return {text: 'Pending your approval', actionable: true};
    case 'MergeRequired':
      return {text: 'Requires merging', actionable: true};
    default:
      const unknown: never = pr.status;
      throw new Error(`Unknown PullRequestStatus: ${unknown}`);
  }
}

function prTemplate(pr: api.PullRequest, newlyActionablePRs: string[]) {
  const status = statusToDisplay(pr);
  const prClasses = ['pr'];
  if (newlyActionablePRs.indexOf(pr.url) !== -1) {
    prClasses.push('is-newly-actionable');
  }
  return html`
    <div class="${prClasses.join(' ')}">
      <div class="pr-header">
        <div class="pr-author">
          <div class="pr-author__name">${pr.author}</div>
          <time class="pr-author__creation-time" datetime="${
      new Date(pr.createdAt).toISOString()}">${
      timeToString(pr.createdAt)}</time>
        </div>

        <div class="pr-avatar">
          <img class="pr-avatar__img" src="${pr.avatarUrl}">
        </div>

        <a class="pr-body" href="${pr.url}" target="_blank">
          <div class="small-heading pr-status">
            <span class="pr-status__msg ${
      status.actionable ? 'actionable' : ''}">${status.text}</span>
          </div>
          <div class="pr-info">
            <span class="pr-info__repo-name">${pr.repository}</span>
            <span class="pr-info__title">${pr.title}</span>
          </div>
        </a>
      </div>
      ${pr.events.map(eventTemplate)}
    </div>`;
}

function hasNewActions(
    newData: api.DashResponse, oldData: api.DashResponse): string[] {
  if (!oldData) {
    return [];
  }

  const newlyActionablePRs: string[] = [];

  const newActions = (newList: PullRequest[], oldList: PullRequest[]) => {
    const oldActionablePRs: {[prUrl: string]: PullRequest} = {};
    oldList.forEach((pr: PullRequest) => {
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
        newlyActionablePRs.push(newPr.url);
      }

      if (JSON.stringify(newPr) !== JSON.stringify(oldPr)) {
        newlyActionablePRs.push(newPr.url);
      }
    }
  };

  newActions(newData.outgoingPrs, oldData.outgoingPrs);
  newActions(newData.incomingPrs, oldData.incomingPrs);

  return newlyActionablePRs;
}

async function getDashData(userLogin: string|null) {
  // This allows you to see another users dashboard.
  const loginParams = userLogin ? `?login=${userLogin}` : '';
  const res =
      await fetch(`/api/dash.json${loginParams}`, {credentials: 'include'});
  const newData = await res.json() as api.DashResponse;
  const results = {
    data: newData,
    newActions: hasNewActions(newData, lastViewedData),
  };

  lastPolledData = newData;
  if (document.hasFocus()) {
    lastViewedData = newData;
  }

  return results;
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


async function performLongPoll(userLogin: string|null) {
  if (longPollTimeoutId) {
    window.clearTimeout(longPollTimeoutId);
  }

  try {
    const {data, newActions} = await getDashData(userLogin);
    renderDash(data, newActions);

    if (newActions.length > 0 && document.hasFocus() === false) {
      changeFavIcon(true);
    } else {
      changeFavIcon(false);
    }
  } catch (err) {
    console.log('Unable to perform long poll update: ', err);
  }

  longPollTimeoutId = window.setTimeout(() => {
    performLongPoll(userLogin);
  }, LONG_POLL_INTERVAL);
}

async function performShortPollAction(userLogin: string|null) {
  const loginParams = userLogin ? `?login=${userLogin}` : '';
  const response = await fetch(`/api/updates/last-known.json${loginParams}`, {
    credentials: 'include',
  });
  const details = (await response.json()) as JSONAPIResponse<LastKnownResponse>;
  if (details.error) {
    console.error(`Uneable to get last known update: ${details.error.message}`);
    return;
  }

  if (!details.data) {
    throw new Error('No data provided by JSON API.');
  }

  if (!details.data.lastKnownUpdate) {
    return;
  }

  if (!lastPolledData) {
    return;
  }

  const lastUpdate = new Date(details.data.lastKnownUpdate);
  if (lastUpdate > new Date(lastPolledData.timestamp)) {
    await performLongPoll(userLogin);
  }
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
  await performLongPoll(userLogin);
  await performShortPoll(userLogin);
}

async function start() {
  window.addEventListener('focus', () => {
    // This will reset the favicon when the user revisits the page
    changeFavIcon(false);

    lastViewedData = lastPolledData;

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

  // This allows you to see another users dashboard.
  const queryParams = new URLSearchParams(window.location.search);
  startPolling(queryParams.get('login'));
}

start();
