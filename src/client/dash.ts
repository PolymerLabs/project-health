import {DashResponse, OutgoingPullRequest} from '../types/shared-types';
import {html, render} from '../../node_modules/lit-html/lit-html.js';

type PullRequestEvent = {
  time: number; text: string;
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

async function start() {
  const queryParams = new URLSearchParams(window.location.search);
  const endpoint = queryParams.has('test') ? '/test-dash.json' : '/dash.json';
  const res = await fetch(endpoint, {credentials: 'include'});
  const json = await res.json() as DashResponse;

  const eventTemplate =
      (event: PullRequestEvent) => {
        return html`
      <time class="pr-event__time" datetime="${
            new Date(event.time).toISOString()}">${
            timeToString(event.time)}</time>
      <div class="pr-event__bullet">
        <svg width="40" height="26">
          <line x1="20" x2="20" y1="0" y2="16"/>
          <circle cx="20" cy="20" r="4.5" />
        </svg>
      </div>
      <div class="pr-event__title">${event.text}</div>`
      }

  const pullRequestTemplate = (pr: OutgoingPullRequest) => {
    const events: PullRequestEvent[] = [];

    // Naive implementation for now.
    for (const review of pr.reviews) {
      events.push({
        time: review.createdAt,
        text: `${review.author} ${review.reviewState}`
      });
    }

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
        <span class="pr-status__msg actionable">Example Status Msg</span>
      </div>
      <div class="pr-info">
        <span class="pr-info__repo-name">${pr.repository}</span>
        <span class="pr-info__title">${pr.title}</span>
      </div>
    </a>

    ${events.map(eventTemplate)}
    `;
  };

  const tmpl = html`
    <style>
      :root {
        --padding: 12px;

        --actionable-color: #ee9709;
        --non-actionable-color: #4a90e2;
        --secondary-text-color: hsl(0, 0%, 40%); /* 5.7 contrast ratio on white */
        --small-text: 12px;
      }

      .pr-container {
        max-width: 1024px;
        margin: 0 auto;

        display: grid;
        align-items: center;
        grid-template-columns: auto 40px 1fr;
        grid-gap: 0px var(--padding);

        font-size: 14px;
      }

      .pr-author {
        grid-column: 1 / 1;

        text-align: right;
        font-size: var(--small-text);
        font-weight: normal;
      }

      .pr-author__creation-time {
        color: var(--secondary-text-color);
      }

      .pr-avatar {
        grid-column: 2 / 2;
        height: 40px;
        margin: 4px 0;
      }

      .pr-avatar__img {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        position: absolute;
      }

      .pr-status {
        display: flex;
        flex-direction: row;
        align-items: center;
        font-weight: bold;
        line-height: 24px;
      }

      .pr-body {
        grid-column: 3 / 3;
        text-decoration: none;
        color: inherit;
      }

      .pr-info {
        font-weight: bold;
      }

      .pr-info__repo-name {
        color: var(--secondary-text-color);
        margin-right: var(--padding);
      }

      .non-actionable {
        color: var(--non-actionable-color);
      }

      .actionable {
        color: var(--actionable-color);
      }

      .pr-event__title {
        grid-column: 3 / 3;
      }

      .pr-event__bullet {
        height: 26px;
      }

      .pr-event__time {
        text-align: right;
        font-size: var(--small-text);
        color: var(--secondary-text-color);
      }

      .pr-event__bullet svg {
        margin-top: -7px;
        stroke: hsl(0, 0%, 75%);
        fill: none;
        stroke-width: 3px;
      }
    </style>
    <div class="pr-container">
      ${json.outgoingPrs.map(pullRequestTemplate)}
    </div>
  `;
  render(tmpl, (document.querySelector('.dash-container') as Element));
}

start();
