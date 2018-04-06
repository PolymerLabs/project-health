import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import * as api from '../../../../types/api.js';

const DEFAULT_AVATAR = '/images/default-avatar.svg';

export function navTemplate(data: api.DashboardUser) {
  let imageUrl = data.avatarUrl ? data.avatarUrl : DEFAULT_AVATAR;
  const buttonTemplates = [];

  if (data.isCurrentUser) {
    buttonTemplates.push(
        html`<a href="/settings" title="Settings" class="settings"></a>`);
  } else {
    imageUrl = '/images/incognito.svg';
  }
  return html`
    <div class="nav-item nav-title">
      <img class="nav-item__avatar" src="/images/favicon.svg">
      <div class="nav-item__name">Project Health</div>
    </div>
    <a class="nav-item selected" href="/">
      <img class="nav-item__avatar" src="${imageUrl}" alt="Avatar of ${
      data.login}" />
      <div class="nav-item__name">${data.login}</div>
      <div class="nav-item-actions">${buttonTemplates}</div>
    </a>
    <div class="nav-item__separator"></div>`;
}
