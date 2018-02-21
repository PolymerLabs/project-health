import {html, render} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api';

const DEFAULT_AVATAR = '/images/default-avatar.svg';

const profileTmpl = (profileData: api.ProfileResponse) => {
  const imageUrl =
      profileData.data.avatarUrl ? profileData.data.avatarUrl : DEFAULT_AVATAR,
        ;
  return html`
  <div class="profile-container">
    <div class="profile-avatar"><img src="${imageUrl}" alt="Avatar of ${
      profileData.data.username}" /></div>
    <div class="profile-header">Welcome ${profileData.data.fullname}</div>
    <div class="profile-buttons"><a href="/settings" title="Settings" class="settings"></a></div>
  </div>
  `;
};

function renderProfileHeader(profileData: api.ProfileResponse) {
  if (profileData.error) {
    console.error('Unable to get profile information.', profileData.error);
    return;
  }

  render(
      profileTmpl(profileData),
      (document.querySelector('.profile-wrapper') as Element));
}

async function start() {
  const profileResponse = await fetch('/api/profile/profile.json', {
    method: 'post',
    credentials: 'include',
  });
  const profileData = await profileResponse.json();

  renderProfileHeader(profileData);
}

start();
