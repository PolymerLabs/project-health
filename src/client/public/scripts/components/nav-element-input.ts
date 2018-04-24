import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import * as api from '../../../../types/api.js';

import {BaseElement, property} from './base-element.js';

export class NavElementInput extends BaseElement {
  @property({attribute: true}) title: string = '';
  @property({attribute: true}) placeholder: string = '';
  @property() endpoint: string = '';
  @property() error?: string;
  @property() private editing: boolean = false;

  private startEditing() {
    this.editing = true;
  }

  private async onKeyPress(event: KeyboardEvent) {
    // Check for enter key.
    if (event.which !== 13) {
      return;
    }

    if (!this.endpoint) {
      console.error('No endpoint configured.');
      return;
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
          {text: (this.querySelector('input') as HTMLInputElement).value}),
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
          this.onKeyPress.bind(this)}"></input>
      `;
    }

    return html`
      <i class="material-icons-extended nav-item__avatar">add_circle</i>
      <span on-click="${this.startEditing.bind(this)}">${this.title}</span>
    `;
  }
}

customElements.define('nav-element-input', NavElementInput);
