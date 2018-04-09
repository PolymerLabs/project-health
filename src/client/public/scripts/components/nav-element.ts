import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api.js';

import {BaseElement} from './base-element.js';

export class NavElement extends BaseElement {
  private _user: api.DashboardUser|null = null;

  get user(): api.DashboardUser|null {
    return this._user;
  }

  set user(user: api.DashboardUser|null) {
    this._user = user;
    this.requestRender();
  }

  _userTemplate(): TemplateResult {
    if (!this.user) {
      return html``;
    }

    let avatarUrl = '/images/default-avatar.svg';
    if (this.user.avatarUrl) {
      avatarUrl = this.user.avatarUrl;
    } else if (!this.user.isCurrentUser) {
      avatarUrl = '/images/incognito.svg';
    }

    const buttons =
        html`<a href="/settings" title="Settings" class="settings"></a>`;

    return html`
      <a class="nav-item selected" href="/">
        <img class="nav-item__avatar" src="${avatarUrl}" alt="Avatar of ${
        this.user.login}" />
        <div class="nav-item__name">${this.user.login}</div>
        <div class="nav-item-actions">${buttons}</div>
      </a>`;
  }

  render() {
    return html`
    <nav>
      <div class="nav-item nav-title">
        <img class="nav-item__avatar" src="/images/favicon.svg">
        <div class="nav-item__name">Project Health</div>
      </div>
      ${this._userTemplate()}
      <div class="nav-item__separator"></div>
    <nav>`;
  }
}

customElements.define('nav-element', NavElement);
