import './nav-element-input.js';

import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api.js';

import {BaseElement, property} from './base-element.js';

export class NavElement extends BaseElement {
  @property() data: api.UserResponse|null = null;
  // Use property bindings to trigger renders on URL changes.
  @property() documentUrl = document.location.pathname;

  async connectedCallback() {
    this.fetchAndUpdate();

    document.body.addEventListener('url-changed', () => {
      this.documentUrl = document.location.pathname;
    });
    this.addEventListener(
        'nav-update-required', this.fetchAndUpdate.bind(this));
  }

  private async fetchAndUpdate() {
    const response = await fetch('/api/user', {credentials: 'include'});
    const apiResponse =
        await response.json() as api.JSONAPIResponse<api.UserResponse>;
    if ('error' in apiResponse) {
      this.data = null;
      return;
    }
    this.data = apiResponse.data;
  }

  private header(): TemplateResult {
    return html`
      <div class="nav-item nav-title">
        <img class="nav-item__avatar" src="/images/favicon.svg">
        <div class="nav-item__name">Project Health</div>
      </div>
    `;
  }

  private navItemTemplate(
      href: string,
      avatarUrl: string|null,
      title: string,
      button?: TemplateResult): TemplateResult {
    const selected = this.documentUrl === href ? 'selected' : '';
    return html`
      <a class$="nav-item ${selected}" href="${href}">
        <img class="nav-item__avatar" src="${avatarUrl}">
        <div class="nav-item__name">${title}</div>
        ${button}
      </a>
    `;
  }

  private userTemplate(): TemplateResult {
    if (!this.data) {
      return html``;
    }

    return this.navItemTemplate('/', this.data.avatarUrl, this.data.login);
  }

  /**
   * Removes a repo from the menu.
   */
  private async removeRepo(owner: string, name: string, event: MouseEvent) {
    let element: HTMLElement|null = event.target as HTMLElement;

    await fetch('/api/user/remove-repo', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({owner, name}),
    });

    while (element && !element.classList.contains('nav-item')) {
      element = element.parentElement;
    }

    if (element) {
      element.remove();
    }
  }

  private repoTemplate(repo: api.Repository): TemplateResult {
    const removeButton = html`
      <div class="nav-item__buttons">
        <i class="material-icons-extended nav-item__action" title$="Remove ${
        repo.name} from menu" on-click="${
        this.removeRepo.bind(this, repo.owner, repo.name)}">remove_circle</i>
      </div>
    `;

    return this.navItemTemplate(
        `/repo/${repo.owner}/${repo.name}`,
        repo.avatarUrl,
        repo.name,
        removeButton);
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

        <nav-element-input class="nav-item" title="Add repository"
          placeholder="owner/repo"
          apiEndpoint="${'/api/user/add-repo'}"></nav-element-input>

        <div class="nav-item__separator"></div>

        <a class="nav-item nav-item-secondary" href="https://github.com/polymerlabs/project-health/issues/new" target="blank">
          <i class="material-icons-extended nav-item__avatar">feedback</i>
          <div class="nav-item__name">File feedback</div>
        </a>
      <nav>
    `;
  }
}

customElements.define('nav-element', NavElement);
