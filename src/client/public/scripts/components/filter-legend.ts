import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {FilterState} from '../dash/filter-controller.js';

export type FilterLegendItem = {
  type: 'complete'|'actionable'|'activity'|'passive',
  description: string,
  selected?: boolean,
};

import {BaseElement, property} from './base-element.js';

export interface FilterLegendEvent {
  state: FilterState;
}

export class FilterLegend extends BaseElement {
  @property() filters: FilterLegendItem[] = [];

  constructor() {
    super();
    this.classList.add('small-heading');
  }

  _renderFilter(filter: FilterLegendItem) {
    function handleToggle(event: Event) {
      const item = event.target as HTMLElement;
      item.classList.toggle('selected');

      // Walk the event target's ancestor to find the legend container.
      let legend = item;
      while (!legend.matches('filter-legend') && legend.parentElement) {
        legend = legend.parentElement;
      }

      const filters = Array.from(legend.querySelectorAll('.legend-item'));
      const result: FilterState = {};
      for (const filter of filters) {
        const type = filter.getAttribute('type');
        if (type) {
          result[type] = filter.classList.contains('selected');
        }
      }

      legend.dispatchEvent(new CustomEvent<FilterLegendEvent>(
          'legend-change', {detail: {state: result}}));
    }

    const selectedClass =
        filter.selected === undefined || filter.selected ? 'selected' : '';

    return html
    `<div class$="legend-item ${selectedClass}" type$="${
        filter.type}" on-click="${handleToggle.bind(this)}">${
        filter.description}</div>`;
  }

  render() {
    if (!this.filters) {
      return html``;
    }

    return html`${this.filters.map(this._renderFilter.bind(this))}`;
  }
}

customElements.define('filter-legend', FilterLegend);
