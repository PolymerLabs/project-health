import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import {timeToString} from '../dash/utils/time-to-string.js';

import {BaseElement, property} from './base-element.js';
import {RowData} from './row-element.js';

export class RowHeader extends BaseElement {
  @property() rowData: RowData|undefined = undefined;
  @property() extraHeaderData: TemplateResult[]|undefined = undefined;

  constructor() {
    super();
  }

  render() {
    async function handleRowClick(event: Event) {
      if (!data) {
        return;
      }

      let anchorElement: HTMLElement|null = event.target as HTMLElement;
      while (anchorElement &&
             !anchorElement.classList.contains('dashboard-row-link')) {
        anchorElement = anchorElement.parentNode as HTMLElement;
      }

      if (!anchorElement || !anchorElement.hasAttribute('has-new-activity')) {
        return;
      }

      anchorElement.removeAttribute('has-new-activity');

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

    const data = this.rowData;
    if (!data) {
      return html``;
    }

    return html`
<div class="dashboard-row-author">
  <div class="dashboard-row-author__name">${data.author}</div>
    <time class="dashboard-row-author__creation-time" datetime="${
        new Date(data.createdAt).toISOString()}">${
        timeToString(data.createdAt)}</time>
</div>

<div class="dashboard-row-avatar">
  <img class="dashboard-row-avatar__img" src="${data.avatarUrl}">
</div>

<a class="dashboard-row-link" href="${data.url}" target="_blank" on-click="${
        handleRowClick}" has-new-activity$="${data.hasNewActivity}">
  <div class="dashboard-row-status small-heading">
    <span class="dashboard-row-status__msg">${data.status.text}</span>
    <span class="dashboard-row-status__has-activity" title="New, unread activity"></span>
  </div>
  <div class="dashboard-row-info">
    <span class="dashboard-row-info__repo-name">${data.owner}/${
        data.repo}</span>
    <span class="dashboard-row-info__title">${data.title}</span>
  </div>
</a>

${this.extraHeaderData}
`;
  }
}

customElements.define('row-header', RowHeader);
