import {DashResponse, PullRequest} from '../api';
import {html, render} from './node_modules/lit-html/lit-html.js';

async function start() {
  const queryParams = new URLSearchParams(window.location.search);
  const endpoint = queryParams.has('test') ? '/test-dash.json' : '/dash.json';
  const res = await fetch(endpoint, {credentials: 'include'});
  const json = await res.json() as DashResponse;

  const pullRequestTemplate = (pr: PullRequest) => {
    let approverElements = ``;
    if (pr.approvedBy.length > 0) {
      approverElements = `
      <span class="pr-status__seperator">&middot;</span>
      <span class="pr-status__approvals">approved by ${
          pr.approvedBy.join(', ')}</span>
      `;
    }

    let ellapsedValue = (Date.now() - pr.createdAt) / 1000;
    let ellapsedUnit = 'seconds';
    if (ellapsedValue > 60) {
      ellapsedValue = ellapsedValue / 60;
      ellapsedUnit = 'minutes';

      if (ellapsedValue > 60) {
        ellapsedValue = ellapsedValue / 60;
        ellapsedUnit = 'hours';

        if (ellapsedValue > 24) {
          ellapsedValue = ellapsedValue / 24;
          ellapsedUnit = 'days';

          if (ellapsedValue > 365) {
            ellapsedValue = ellapsedValue / 365;
            ellapsedUnit = 'years';
          } else if (ellapsedValue > 30) {
            ellapsedValue = ellapsedValue / 30;
            ellapsedUnit = 'months';
          }
        }
      }
    }

    let ellapsedString = `${(ellapsedValue).toFixed(0)} ${ellapsedUnit} ago`;

    return html`
    <div class="pr-author">
      <div class="pr-author__name">${pr.login}</div>
      <time class="pr-author__creation-time" datetime="${
        new Date(pr.createdAt).toISOString()}">${ellapsedString}</time>
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

      .pr-status__seperator {
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

      /** States **/
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
