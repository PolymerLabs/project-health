import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import * as api from '../../../../types/api.js';

import {BaseElement, property} from './base-element.js';

export class NavElementInput extends BaseElement {
  @property({attribute: true}) title = '';
  @property({attribute: true}) placeholder = '';
  @property() apiEndpoint = '';
  @property() error?: string;
  @property() private editing = false;

  connectedCallback() {
    this.addEventListener('click', this.startEditing.bind(this));
  }

  private startEditing() {
    this.editing = true;
  }

  private finishEditing() {
    this.editing = false;
    this.error = undefined;
  }

  private async onKeyPress(event: KeyboardEvent) {
    // Check for enter key.
    if (event.which !== 13) {
      return;
    }

    if (!this.apiEndpoint) {
      console.error('No endpoint configured.');
      return;
    }

    const inputElement = this.querySelector('input') as HTMLInputElement;

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({nameWithOwner: inputElement.value}),
    });

    if (response.status === 200) {
      this.dispatchEvent(
          new CustomEvent('nav-update-required', {bubbles: true}));
      this.editing = false;
    } else {
      const data = await response.json() as api.JSONAPIErrorResponse;
      this.error = data.error.message;
      // Clear input field
      (this.querySelector('input') as HTMLInputElement).value = '';
    }
  }

  render() {
    if (this.editing) {
      const placeholder = this.error || this.placeholder;
      return html`
        <i class="material-icons-extended nav-item__avatar">add_circle</i>
        <input type="text" placeholder="${placeholder}" on-keypress="${
          this.onKeyPress.bind(
              this)}" on-blur="${this.finishEditing.bind(this)}"></input>
      `;
    }

    return html`
      <i class="material-icons-extended nav-item__avatar">add_circle</i>
      <span class="nav-item-secondary">${this.title}</span>
    `;
  }

  afterRender() {
    // Immediately focus the input element.
    if (this.editing) {
      const inputElement = this.querySelector('input') as HTMLInputElement;
      inputElement.focus();
    }
  }
}

customElements.define('nav-element-input', NavElementInput);
