import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api.js';

import {BaseElement, property} from './base-element.js';

export class NavElement extends BaseElement {
  @property() data: api.UserResponse|null = null;
  // Use property bindings to trigger renders on URL changes.
  @property() documentUrl = document.location.pathname;

  async connectedCallback() {
    const response = await fetch('/api/user', {credentials: 'include'});
    // TODO: change this to use the JSON API response
    this.data = (await response.json()).data as api.UserResponse;

    document.body.addEventListener('url-changed', () => {
      this.documentUrl = document.location.pathname;
    });
  }

  private header(): TemplateResult {
    return html`
      <div class="nav-item nav-title">
        <img class="nav-item__avatar" src="/images/favicon.svg">
        <div class="nav-item__name">Project Health</div>
      </div>
    `;
  }

  private navItemTemplate(href: string, avatarUrl: string|null, title: string):
      TemplateResult {
    const selected = this.documentUrl === href ? 'selected' : '';
    return html`
      <a class$="nav-item ${selected}" href="${href}">
        <img class="nav-item__avatar" src="${avatarUrl}">
        <div class="nav-item__name">${title}</div>
      </a>
    `;
  }

  private userTemplate(): TemplateResult {
    if (!this.data) {
      return html``;
    }

    return this.navItemTemplate('/', this.data.avatarUrl, this.data.login);
  }

  private repoTemplate(repo: api.Repository): TemplateResult {
    return this.navItemTemplate(
        `/repo/${repo.owner}/${repo.name}`, repo.avatarUrl, repo.name);
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
