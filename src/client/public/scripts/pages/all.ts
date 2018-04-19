import {asyncAppend} from '../../../../../node_modules/lit-html/lib/async-append.js';
import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api.js';
import {BaseElement} from '../components/base-element.js';

import {outgoingPrTemplate} from '../dash/prs.js';

class DashPagination extends BaseElement {
  constructor() {
    super();
    // Required for auto merge UI to work.
    // TODO: this is really slow as a new fetch is done when interacting with
    // auto merge UI.
    document.body.addEventListener(
        'render-outgoing-request', this.requestRender.bind(this));
  }

  render(): TemplateResult {
    const queryParams = new URLSearchParams(window.location.search);
    const userLogin = queryParams.get('login');
    return html`
<h2>Outgoing pull requests</h2>
<div class="pr-list">
  ${asyncAppend(this._getNextElement(userLogin))}
</div>`;
  }

  /**
   * Async generator which yields lit-html TemplateResults. This fetches pages
   * from the API and yields each rendered pull request result.
   */
  async * _getNextElement(userLogin: string|null) {
    const loginParam = userLogin ? `login=${userLogin}` : '';
    let data: api.OutgoingDashResponse|null = null;

    while (!data || data.hasMore) {
      // Set new cursor information.
      const cursorParam: string = data ? `cursor=${data.cursor}` : '';
      const response = await fetch(
          `/api/dash/outgoing?${[loginParam, cursorParam].join('&')}`,
          {credentials: 'include'});
      // TODO: update to use JSON API response
      data = (await response.json()).data as api.OutgoingDashResponse;

      // Render each PR and yield each result so they can be added to the DOM.
      for (const pr of data.prs) {
        yield outgoingPrTemplate(pr);
      }
    }
  }
}

customElements.define('dash-pagination', DashPagination);
