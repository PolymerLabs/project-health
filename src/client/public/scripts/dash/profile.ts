import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import * as api from '../../../../types/api.js';

const DEFAULT_AVATAR = '/images/default-avatar.svg';

export function profileTemplate(data: api.DashboardUser) {
  let imageUrl = data.avatarUrl ? data.avatarUrl : DEFAULT_AVATAR;
  const buttonTemplates = [];

  if (data.isCurrentUser) {
    buttonTemplates.push(
        html`<a href="/settings" title="Settings" class="settings"></a>`);
  } else {
    imageUrl = '/images/incognito.svg';
  }
  return html`
    <div class="profile-avatar"><img src="${imageUrl}" alt="Avatar of ${
      data.login}" /></div>
    <div class="profile-header">Welcome ${data.login}</div>
    <div class="profile-buttons">
      ${buttonTemplates}
    </div>`;
}
