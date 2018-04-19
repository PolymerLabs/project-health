import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api.js';

import {BaseElement, property} from './base-element.js';

export class NavElement extends BaseElement {
  @property() data: api.UserResponse|null = null;

  async connectedCallback() {
    const response = await fetch('/api/user', {credentials: 'include'});
    this.data = (await response.json()).data as api.UserResponse;
  }

  _userTemplate(): TemplateResult {
    if (!this.data) {
      return html``;
    }

    return html`
      <a class="nav-item selected" href="/">
        <img class="nav-item__avatar" src="${this.data.avatarUrl}"
            alt="Avatar of ${this.data.login}" />
        <div class="nav-item__name">${this.data.login}</div>
      </a>
    `;
  }

  _header(): TemplateResult {
    return html`
      <div class="nav-item nav-title">
        <img class="nav-item__avatar" src="/images/favicon.svg">
        <div class="nav-item__name">Project Health</div>
      </div>
    `;
  }

  _repoTemplate(repo: api.Repository): TemplateResult {
    return html`
      <a class="nav-item" href="/repo/${repo.owner}/${repo.name}">
        <img class="nav-item__avatar" src="${repo.avatarUrl}">
        <div class="nav-item__name">${repo.name}</div>
      </a>
    `;
  }

  render() {
    if (!this.data) {
      return html`<nav>${this._header()}</nav>`;
    }

    return html`
      <nav>
        ${this._header()}
        ${this._userTemplate()}

        <div class="nav-item__separator"></div>

        ${this.data.repos.map(this._repoTemplate)}

        <div class="nav-item__separator"></div>
      <nav>
    `;
  }
}

customElements.define('nav-element', NavElement);
