import './row-header.js';

import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import {timeToString} from '../dash/utils/time-to-string.js';

import {BaseElement, property} from './base-element.js';

export interface StatusDisplay {
  type: 'complete'|'actionable'|'activity'|'passive';
  text: string;
}

export interface RowData {
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
}

export interface RowEvent {
  text: string|TemplateResult;
  time?: number;
  url?: string;
}

export class RowElement extends BaseElement {
  @property() data: RowData|null = null;
  @property() extraHeaderData: TemplateResult[] = [];
  @property() events: RowEvent[] = [];
  @property() extraElement?: HTMLElement;

  _renderEvent(event: RowEvent) {
    function timeTemplate(time?: number) {
      if (!time) {
        return html`<time class="dashboard-row-event__time"></time>`;
      }
      return html`<time class="dashboard-row-event__time" datetime="${
          new Date(time).toISOString()}">${timeToString(time)}</time>`;
    }

    function linkTemplate(text: string|TemplateResult, url?: string) {
      if (!url) {
        return text;
      } else {
        return html`<a class="dashboard-row-event__url" href="${
            url}" target="_blank">${text}</a>`;
      }
    }

    return html`
<div class="dashboard-row-event">
  ${timeTemplate(event.time)}

  <div class="dashboard-row-event__bullet">
    <svg width="40" height="100%">
      <circle cx="20.5" cy="6" r="4.5" />
    </svg>
  </div>
  <div class="dashboard-row-event__title">
    ${linkTemplate(event.text, event.url)}
  </div>
</div>`;
  }

  render() {
    if (!this.data) {
      return html``;
    }

    this.setAttribute('type', this.data.status.type);

    if (this.events.length) {
      this.classList.add('has-events');
    }

    return html`
  <row-header rowData="${this.data}" extraHeaderData="${this.extraHeaderData}">
  </row-header>

  ${this.events.map(this._renderEvent)}
  ${this.extraElement}`;
  }
}

customElements.define('row-element', RowElement);
