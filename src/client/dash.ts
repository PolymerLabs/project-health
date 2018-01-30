import {html, render} from '../../node_modules/lit-html/lit-html.js';
import * as api from '../types/api';

type EventDisplay = {
  time: number|null; text: string;
};

type StatusDisplay = {
  actionable: boolean; text: string;
};

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

function reviewStateToString(state: string) {
  if (state === 'APPROVED') {
    return 'approved changes';
  } else if (state === 'CHANGES_REQUESTED') {
    return 'requested changes';
  } else if (state === 'COMMENTED') {
    return 'reviewed with comments';
  } else if (state === 'DIMUEOS') {
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
      return {text, time: latest};
    case 'MyReviewEvent':
      return {
        text: `You ${reviewStateToString(event.review.reviewState)}`,
        time: event.review.createdAt,
      };
    case 'NewCommitsEvent':
    case 'MentionedEvent':
      return {text: 'Not implemented yet.', time: null};
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
  return html`
    ${display.time ? timeTemplate(display.time) : ''}

    <div class="pr-event__bullet">
      <svg width="40" height="26">
        <line x1="20" x2="20" y1="0" y2="16"/>
        <circle cx="20" cy="20" r="4.5" />
      </svg>
    </div>
    <div class="pr-event__title">${display.text}</div>`;
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

function prTemplate(pr: api.PullRequest) {
  const status = statusToDisplay(pr);
  return html`
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
      <div class="pr-status">
        <span class="pr-status__msg ${status.actionable ? 'actionable' : ''}">${
      status.text}</span>
      </div>
      <div class="pr-info">
        <span class="pr-info__repo-name">${pr.repository}</span>
        <span class="pr-info__title">${pr.title}</span>
      </div>
    </a>

    ${pr.events.map(eventTemplate)}`;
}

async function start() {
  const queryParams = new URLSearchParams(window.location.search);
  const loginParams =
      queryParams.get('login') ? `?login=${queryParams.get('login')}` : '';
  const res = await fetch(`/dash.json${loginParams}`, {credentials: 'include'});
  const json = await res.json() as api.DashResponse;

  const tmpl = html`
    <h1>Outgoing pull requests</h1>
    <div class="pr-list">
      ${json.outgoingPrs.map(prTemplate)}
    </div>
    <h1>Incoming pull requests</h1>
    <div class="pr-list">
      ${json.incomingPrs.map(prTemplate)}
    </div>
  `;
  render(tmpl, (document.querySelector('.dash-container') as Element));
}

start();
