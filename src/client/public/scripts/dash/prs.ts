import {html} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api';

type EventDisplay = {
  time: number|null; text: string; url: string | null;
};

type StatusDisplay = {
  actionable: boolean; text: string;
};

const DEFAULT_AVATAR = '/images/default-avatar.svg';

export function profileTemplate(data: api.DashboardUser) {
  let imageUrl = data.avatarUrl ? data.avatarUrl : DEFAULT_AVATAR;
  const buttonTemplates = [];

  if (data.isCurrentUser) {
    buttonTemplates.push(
        html`<a href="/settings" title="Settings" class="settings"></a>`);
  } else {
    imageUrl = '/images/incognito.svg';
  }
  return html`
    <div class="profile-avatar"><img src="${imageUrl}" alt="Avatar of ${
      data.login}" /></div>
    <div class="profile-header">Welcome ${data.login}</div>
    <div class="profile-buttons">
      ${buttonTemplates}
    </div>`;
}

export function prListTemplate(
    prList: api.PullRequest[],
    newlyActionablePRs: string[],
    emptyMessage: string) {
  if (prList.length) {
    return html`${prList.map((pr) => prTemplate(pr, newlyActionablePRs))}`;
  } else {
    return html
    `<div class="pr-list__empty-message">${emptyMessage}</div>`;
  }
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
          ${
      display.url ? linkTemplate(display.url, display.text) : display.text}
        </div>
      </div>`;
}

export function statusToDisplay(pr: api.PullRequest): StatusDisplay {
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

export function prTemplate(pr: api.PullRequest, newlyActionablePRs?: string[]) {
  const status = statusToDisplay(pr);
  const prClasses = ['pr'];
  if (newlyActionablePRs && newlyActionablePRs.indexOf(pr.url) !== -1) {
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
