import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';

import {BaseElement} from './base-element.js';

export interface ToggleDetails {
  label: string;
  selectedImg: string;
  deselectedImg: string;
}

export class ToggleElement extends BaseElement {
  private _details: ToggleDetails|null = null;
  private isSelected = false;

  set details(details: ToggleDetails) {
    this._details = details;
    this.requestRender();
  }

  set selected(selected: boolean) {
    this.isSelected = selected;
    this.requestRender();
  }

  get selected(): boolean {
    return this.isSelected;
  }

  render() {
    if (!this._details) {
      return html``;
    }

    const toggleClick = () => {
      if (this.hasAttribute('disabled')) {
        return;
      }

      this.isSelected = !this.isSelected;
      this.requestRender();
      this.dispatchEvent(new Event('change'));
    };

    const imgSrc = this.isSelected ? this._details.selectedImg :
                                     this._details.deselectedImg;
    return html`
      <div class="toggle-element-container" on-click="${toggleClick}">
        <span>${this._details.label}</span>
        <img src="${imgSrc}" alt="Toggle Button Image" />
      </div>`;
  }
}

customElements.define('toggle-element', ToggleElement);
