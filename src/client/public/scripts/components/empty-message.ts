import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';

import {BaseElement, property} from './base-element.js';

export abstract class EmptyMessage extends BaseElement {
  @property({attribute: true}) title = '';
  @property({attribute: true}) description = '';

  render() {
    return html`
    <div class="empty-message__avatar">
      <i class="material-icons-extended empty-message__sun">wb_sunny</i>
    </div>

    <div>
      <div class="small-heading">${this.title}</div>
      <div class="empty-message__description">${this.description}</div>
    </div>`;
  }
}

customElements.define('empty-message', EmptyMessage);

export function createEmptyMessage(title: string, description: string) {
  return html`<empty-message title$="${title}" description$="${
      description}"></empty-message>`;
}
