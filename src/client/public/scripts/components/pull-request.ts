import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import * as api from '../../../../types/api.js';
import {getAutoMergeOptions} from '../dash/auto-merge-events.js';
import {parseAsEventModel} from '../dash/pr-event.js';
import {statusToDisplay} from '../dash/prs.js';

import {BaseElement, property} from './base-element.js';
import {RowData} from './row-element.js';

export class PullRequest extends BaseElement {
  @property() data?: api.PullRequest|api.OutgoingPullRequest;

  render() {
    if (!this.data) {
      return html``;
    }
    const pr = this.data;
    const prEvents = pr.events.map((event) => parseAsEventModel(event));

    let events = prEvents;
    if ('automergeAvailable' in pr) {
      events = events.concat(getAutoMergeOptions(pr));
    }

    const data: RowData = {
      id: pr.id,
      createdAt: pr.createdAt,
      author: pr.author,
      avatarUrl: pr.avatarUrl,
      url: pr.url,
      title: pr.title,
      owner: pr.owner,
      repo: pr.repo,
      status: statusToDisplay(pr),
      hasNewActivity: pr.hasNewActivity,
    };

    return html`<row-element data="${data}" events="${events}"></row-element>`;
  }
}

customElements.define('pull-request', PullRequest);
