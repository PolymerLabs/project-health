import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import {timeToString} from '../dash/utils/time-to-string.js';

/**
 * This is a row in the dashboard (the UI with date, avatar, title and body
 * along with the vertical bullets / events)
 */

export interface StatusDisplay {
  type: 'complete'|'actionable'|'activity';
  text: string;
  className?: string;
}

export interface DashboardRowData {
  id: string;
  status: StatusDisplay;
  createdAt: number;
  author: string;
  avatarUrl: string;
  url: string;
  title: string;
  owner: string;
  repo: string;
  hasNewActivity: boolean;
  classes?: string[];
}

export interface DashboardRowEventData {
  text: string|TemplateResult;
  time?: number;
  url?: string;
  classes?: string[];
}

export function genericDashboardRowEventTemplate(data: DashboardRowEventData):
    TemplateResult {
  const timeTemplate = (time: number) =>
      html`<time class="dashboard-row-event__time" datetime="${
          new Date(time).toISOString()}">${timeToString(time)}</time>`;

  const linkTemplate = (url: string, text: string|TemplateResult) =>
      html`<a class="dashboard-row-event__url" href="${url}" target="_blank">${
          text}</a>`;

  return html`
      <div class$="dashboard-row-event ${
      data.classes ? data.classes.join(' ') : ''}">
        ${
      data.time ? timeTemplate(data.time) :
                  html`<div class="dashboard-row-event__time"></div>`}

        <div class="dashboard-row-event__bullet">
          <svg width="40" height="100%">
            <circle cx="20.5" cy="6" r="4.5" />
          </svg>
        </div>
        <div class="dashboard-row-event__title">
          ${data.url ? linkTemplate(data.url, data.text) : data.text}
        </div>
      </div>`;
}

export function genericDashboardRowTemplate(
    data: DashboardRowData,
    extraHeaderData?: TemplateResult[],
    extraEvents?: TemplateResult[]): TemplateResult {
  const additionalClasses: string[] = data.classes || [];
  const rowClasses = ['dashboard-row', ...additionalClasses];
  if (extraEvents && extraEvents.length > 0) {
    rowClasses.push('has-events');
  }

  const status = data.status;

  async function handleRowClick(event: Event) {
    let anchorElement: HTMLElement|null = event.target as HTMLElement;
    while (anchorElement &&
           !anchorElement.classList.contains('dashboard-row-link')) {
      anchorElement = anchorElement.parentNode as HTMLElement;
    }
    console.log(anchorElement);

    if (anchorElement) {
      anchorElement.removeAttribute('has-new-activity');
    }

    const response = await fetch('/api/last-viewed/update/', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        id: data.id,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.warn('Unable to update last-viewed timestamp: ', responseText);
    }
  }

  return html`
      <div class$="${rowClasses.join(' ')}" type$="${status.type}">
        <div class="dashboard-row-header">
          <div class="dashboard-row-author">
            <div class="dashboard-row-author__name">${data.author}</div>
            <time class="dashboard-row-author__creation-time" datetime="${
      new Date(data.createdAt).toISOString()}">${
      timeToString(data.createdAt)}</time>
          </div>

          <div class="dashboard-row-avatar">
            <img class="dashboard-row-avatar__img" src="${data.avatarUrl}">
          </div>

          <a class="dashboard-row-link" href="${
      data.url}" target="_blank" on-click="${
      handleRowClick}" has-new-activity$="${data.hasNewActivity}">
            <div class="dashboard-row-status small-heading">
              <span class="dashboard-row-status__msg">${status.text}</span>
              <span class="dashboard-row-status__has-activity"></span>
            </div>
            <div class="dashboard-row-info">
              <span class="dashboard-row-info__repo-name">${data.owner}/${
      data.repo}</span>
              <span class="dashboard-row-info__title">${data.title}</span>
            </div>
          </a>

          ${extraHeaderData}
        </div>

        ${extraEvents}
      </div>`;
}
