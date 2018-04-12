import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {FilterState} from '../dash/filter-controller.js';

export type FilterLegendItem = {
  type: 'complete'|'actionable'|'activity'|'passive',
  description: string,
  selected?: boolean,
};

import {BaseElement} from './base-element.js';

export class FilterLegend extends BaseElement {
  private _filters: FilterLegendItem[] = [];

  constructor() {
    super();
    this.classList.add('small-heading');
  }

  get filters() {
    return this._filters;
  }

  set filters(filters: FilterLegendItem[]) {
    this._filters = filters;
    this.requestRender();
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
      item.dispatchEvent(
          new CustomEvent('legend-change', {detail: result, bubbles: true}));
    }

    const selectedClass =
        filter.selected === undefined || filter.selected ? 'selected' : '';

    return html
    `<div class$="legend-item ${selectedClass}" type$="${
        filter.type}" on-click="${handleToggle}">${filter.description}</div>`;
  }

  render() {
    if (!this.filters) {
      return html``;
    }
    return html`${this.filters.map(this._renderFilter)}`;
    ;
  }
}

customElements.define('filter-legend', FilterLegend);
