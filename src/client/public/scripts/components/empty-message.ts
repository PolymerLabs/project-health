import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';

export type EmptyMessage = {
  title: string; description: string;
};

export function emptyTemplate(message: EmptyMessage) {
  return html`
  <div class="empty-message">
    <div class="empty-message__avatar">
      <div class="empty-message__sun"></div>
    </div>

    <div>
      <div class="small-heading">${message.title}</div>
      <div class="empty-message__description">${message.description}</div>
    </div>
  </div>
  `;
}
