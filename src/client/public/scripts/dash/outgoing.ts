import {asyncAppend} from '../../../../../node_modules/lit-html/lib/async-append.js';
import {html, render} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import * as api from '../../../../types/api.js';

import {outgoingPrTemplate} from './prs.js';

/**
 * Async generator which yields lit-html TemplateResults. This fetches pages
 * from the API and yields each rendered pull request result.
 */
async function* getNextElement(userLogin: string|null) {
  const loginParam = userLogin ? `login=${userLogin}` : '';
  let data: api.OutgoingDashResponse|null = null;

  while (!data || data.hasMore) {
    // Set new cursor information.
    const cursorParam: string = data ? `cursor=${data.cursor}` : '';
    const response = await fetch(
        `/api/dash/outgoing?${[loginParam, cursorParam].join('&')}`,
        {credentials: 'include'});
    data = await response.json() as api.OutgoingDashResponse;

    // Render each PR and yield each result so they can be added to the DOM.
    for (const pr of data.prs) {
      // Note: This will never flash due to flash here.
      yield outgoingPrTemplate(pr, false);
    }
  }
}

function start() {
  // This allows you to see another users dashboard.
  const queryParams = new URLSearchParams(window.location.search);
  const userLogin = queryParams.get('login');
  // asyncAppend() expects an async iterable which loops over the iterator and
  // appends these results to the containing element.
  render(
      html`${asyncAppend(getNextElement(userLogin))}`,
      (document.querySelector('#outgoing') as Element));
}

start();
