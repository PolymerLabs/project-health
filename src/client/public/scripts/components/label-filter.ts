import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {Label} from '../../../../types/api.js';

import {BaseElement, property} from './base-element.js';

export interface LabelFilterChangedEvent {
  selectedLabels: string[];
}

export abstract class LabelFilter extends BaseElement {
  @property() labels = [];

  private toggleSelection(event: MouseEvent) {
    const target = event.target as HTMLElement;
    target.classList.toggle('selected');


    const selectedLabels =
        Array.from(this.querySelectorAll('.label-item.selected'))
            .map((element) => element.textContent || '');

    this.dispatchEvent(new CustomEvent<LabelFilterChangedEvent>(
        'label-filter-changed', {detail: {selectedLabels}}));
  }

  private labelTemplate(label: Label) {
    return html`
      <div class="label-item" on-click="${
        this.toggleSelection.bind(this)}" title="${
        label.description ? label.description : ''}">${label.name}</div>
    `;
  }

  render() {
    return html`
      ${this.labels.map(this.labelTemplate.bind(this))}
    `;
  }
}

customElements.define('label-filter', LabelFilter);
