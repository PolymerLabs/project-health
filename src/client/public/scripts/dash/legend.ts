import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {FilterState} from './filter-controller.js';

export type LegendItem = {
  type: 'complete'|'actionable'|'activity',
  description: string,
};

function itemTemplate(item: LegendItem) {
  function handleToggle(event: Event) {
    const item = event.target as HTMLElement;
    if (item.hasAttribute('disabled')) {
      item.removeAttribute('disabled');
    } else {
      item.setAttribute('disabled', '');
    }

    // Walk the event target's ancestor to find the legend container.
    let legend = item;
    while (!legend.matches('.legend') && legend.parentElement) {
      legend = legend.parentElement;
    }

    const items = Array.from(legend.querySelectorAll('.legend-item'));
    const result: FilterState = {};
    for (const item of items) {
      const type = item.getAttribute('type');
      if (type) {
        result[type] = item.hasAttribute('disabled');
      }
    }
    item.dispatchEvent(
        new CustomEvent('legend-change', {detail: result, bubbles: true}));
  }

  return html
  `<div class="legend-item" type$="${item.type}" on-click="${handleToggle}">${
      item.description}</div>`;
}

export function legendTemplate(types: LegendItem[]) {
  return html`
  <div class="legend small-heading">
    ${types.map(itemTemplate)}
  </div>
  `;
}
