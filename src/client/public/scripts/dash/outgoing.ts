import {asyncAppend} from '../../../../../node_modules/lit-html/lib/async-append.js';
import {html, render} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api';

import {prTemplate} from './prs';

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

    // Render each PR.
    for (const pr of data.prs) {
      yield prTemplate(pr, []);
    }
  }
}

function start() {
  // This allows you to see another users dashboard.
  const queryParams = new URLSearchParams(window.location.search);
  const userLogin = queryParams.get('login');
  render(
      html`${asyncAppend(getNextElement(userLogin))}`,
      (document.querySelector('#outgoing') as Element));
}

start();
