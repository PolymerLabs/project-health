import {DashResponse, PullRequest} from '../api';
import {html, render} from './node_modules/lit-html/lit-html.js';

async function start() {
  const queryParams = new URLSearchParams(window.location.search);
  const endpoint = queryParams.has('test') ? '/test-dash.json' : '/dash.json';
  const res = await fetch(endpoint, {credentials: 'include'});
  const json = await res.json() as DashResponse;

  const pullRequestTemplate = (pr: PullRequest) => {
    let approverElements = '';
    if (pr.approvedBy.length > 0) {
      approverElements = `
      <span class="pr-status__separator">&middot;</span>
      <span class="pr-status__approvals">approved by ${
          pr.approvedBy.join(', ')}</span>
      `;
    }

    let elapsedValue = (Date.now() - pr.createdAt) / 1000;
    let elapsedUnit = 'seconds';
    if (elapsedValue > 60) {
      elapsedValue = elapsedValue / 60;
      elapsedUnit = 'minutes';

      if (elapsedValue > 60) {
        elapsedValue = elapsedValue / 60;
        elapsedUnit = 'hours';

        if (elapsedValue > 24) {
          elapsedValue = elapsedValue / 24;
          elapsedUnit = 'days';

          if (elapsedValue > 365) {
            elapsedValue = elapsedValue / 365;
            elapsedUnit = 'years';
          } else if (elapsedValue > 30) {
            elapsedValue = elapsedValue / 30;
            elapsedUnit = 'months';
          }
        }
      }
    }

    let elapsedString = `${(elapsedValue).toFixed(0)} ${elapsedUnit} ago`;

    return html`
    <div class="pr-author">
      <div class="pr-author__name">${pr.author}</div>
      <time class="pr-author__creation-time" datetime="${
        new Date(pr.createdAt).toISOString()}">${elapsedString}</time>
    </div>

    <div class="pr-avatar">
      <img class="pr-avatar__img" src="${pr.avatarUrl}">
    </div>

    <div class="pr-body">
      <div class="pr-status">
        <span class="pr-status__msg ${
        pr.actionable ? 'actionable' :
                        'non-actionable'}">Example Status Msg</span>
        ${approverElements}
      </div>
      <a href="${pr.prUrl}" target="_blank" class="pr-info">
        <span class="pr-info__repo-name">${pr.repository}</span>
        <span class="pr-info__title">${pr.title}</span>
      </a>
    </div>
    `;
  };

  const tmpl = html`
    <style>
      :root {
        --padding: 8px;

        --actionable-color: #ee9709;
        --non-actionable-color: #4a90e2;
        --secondary-text-color: #696969;
      }

      .pr-container {
        max-width: 1024px;
        margin: 0 auto;

        display: grid;
        align-items: center;
        grid-template-columns: auto 52px 1fr;
        grid-gap: var(--padding);

        font-size: 14px;
      }

      .pr-author {
        grid-column: 1 / 1;

        text-align: right;
        font-size: 0.8rem;
        font-weight: normal;chat.
      }

      .pr-author__creation-time {
        color: var(--secondary-text-color);
      }

      .pr-avatar {
        grid-column: 2 / 2;
      }

      .pr-avatar__img {
        width: 52px;
        height: 52px;
        border-radius: 50%;
      }

      .pr-status {
        display: flex;
        flex-direction: row;
        align-items: center;
        font-weight: bold;
      }

      .pr-status__separator {
        margin: 0 calc(var(--padding) / 2);
      }

      .pr-status__approvals {
        font-weight: normal;
        font-size: 14px;
        color: var(--secondary-text-color);
      }

      .pr-body {
        grid-column: 3 / 3;
      }

      .pr-info {
        text-decoration: none;
        font-weight: bold;
        color: inherit;
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
    </style>
    <div class="pr-container">
    ${json.prs.map(pullRequestTemplate)}
    </div>
  `;
  render(tmpl, (document.querySelector('.dash-container') as Element));
}

start();
