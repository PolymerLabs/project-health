import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';

import {BaseElement} from './base-element.js';

export abstract class EmptyMessage extends BaseElement {
  render() {
    return html`
    <div class="empty-message__avatar">
      <div class="empty-message__sun"></div>
    </div>

    <div>
      <div class="small-heading">${this.getAttribute('title')}</div>
      <div class="empty-message__description">${
        this.getAttribute('description')}</div>
    </div>`;
  }

  static get observedAttributes(): string[] {
    return ['title', 'description'];
  }
}

customElements.define('empty-message', EmptyMessage);

export function createEmptyMessage(title: string, description: string) {
  return html`<empty-message title$="${title}" description$="${
      description}"></empty-message>`;
}
