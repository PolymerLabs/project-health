import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api.js';

import {BaseElement, property} from './base-element.js';

export class NavElement extends BaseElement {
  @property() data: api.UserResponse|null = null;
  @property() documentUrl = document.location.pathname;

  async connectedCallback() {
    const response = await fetch('/api/user', {credentials: 'include'});
    // TODO: change this to use the JSON API response
    this.data = (await response.json()).data as api.UserResponse;

    document.body.addEventListener('url-changed', this.urlChanged.bind(this));
  }

  private urlChanged() {
    this.documentUrl = document.location.pathname;
  }

  private userTemplate(): TemplateResult {
    if (!this.data) {
      return html``;
    }

    const selected = this.documentUrl === '/' ? 'selected' : '';

    return html`
      <a class$="nav-item ${selected}" href="/">
        <img class="nav-item__avatar" src="${this.data.avatarUrl}"
            alt="Avatar of ${this.data.login}" />
        <div class="nav-item__name">${this.data.login}</div>
      </a>
    `;
  }

  private header(): TemplateResult {
    return html`
      <div class="nav-item nav-title">
        <img class="nav-item__avatar" src="/images/favicon.svg">
        <div class="nav-item__name">Project Health</div>
      </div>
    `;
  }

  private repoTemplate(repo: api.Repository): TemplateResult {
    const href = `/repo/${repo.owner}/${repo.name}`;
    const selected = this.documentUrl === href ? 'selected' : '';
    return html`
      <a class$="nav-item ${selected}" href="${href}">
        <img class="nav-item__avatar" src="${repo.avatarUrl}">
        <div class="nav-item__name">${repo.name}</div>
      </a>
    `;
  }

  render() {
    if (!this.data) {
      return html`<nav>${this.header()}</nav>`;
    }

    return html`
      <nav>
        ${this.header()}
        ${this.userTemplate()}

        <div class="nav-item__separator"></div>

        ${this.data.repos.map(this.repoTemplate.bind(this))}

        <div class="nav-item__separator"></div>
      <nav>
    `;
  }
}

customElements.define('nav-element', NavElement);
