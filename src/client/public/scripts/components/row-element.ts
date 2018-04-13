import './row-header.js';

import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import {timeToString} from '../dash/utils/time-to-string.js';

import {BaseElement, property} from './base-element.js';

export interface StatusDisplay {
  type: 'complete'|'actionable'|'activity'|'passive';
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

export class RowElement extends BaseElement {
  @property() data: DashboardRowData|null = null;
  @property() extraHeaderData: TemplateResult[] = [];
  @property() events: DashboardRowEventData[] = [];

  _renderEvent(event: DashboardRowEventData) {
    const timeTemplate = (time: number) =>
        html`<time class="dashboard-row-event__time" datetime="${
            new Date(time).toISOString()}">${timeToString(time)}</time>`;

    const linkTemplate = (url: string, text: string|TemplateResult) =>
        html`<a class="dashboard-row-event__url" href="${
            url}" target="_blank">${text}</a>`;

    return html`
<div class$="dashboard-row-event ${
        event.classes ? event.classes.join(' ') : ''}">
  ${
        event.time ? timeTemplate(event.time) :
                     html`<div class="dashboard-row-event__time"></div>`}

  <div class="dashboard-row-event__bullet">
    <svg width="40" height="100%">
      <circle cx="20.5" cy="6" r="4.5" />
    </svg>
  </div>
  <div class="dashboard-row-event__title">
    ${event.url ? linkTemplate(event.url, event.text) : event.text}
  </div>
</div>`;
  }

  render() {
    if (!this.data) {
      return html``;
    }

    const additionalClasses: string[] = this.data.classes || [];
    const rowClasses = ['dashboard-row', ...additionalClasses];
    if (this.events.length) {
      rowClasses.push('has-events');
    }

    return html`
<div class$="${rowClasses.join(' ')}" type$="${this.data.status.type}">
  <row-header rowData="${this.data}" extraHeaderData="${
        this.extraHeaderData}"></row-header>

  ${this.events.map(this._renderEvent)}
</div>`;
  }
}

customElements.define('row-element', RowElement);
