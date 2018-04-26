import './auto-merger.js';

import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import * as api from '../../../../types/api.js';
import {getAutoMergeOptions} from '../dash/auto-merge-events.js';
import {FilterState} from '../dash/filter-controller.js';
import {parseAsEventModel} from '../dash/pr-event.js';

import {shouldShowAutoMerger} from './auto-merger.js';
import {BaseElement, property} from './base-element.js';
import {createEmptyMessage} from './empty-message.js';
import {StatusDisplay} from './row-element.js';
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
    if ('automergeAvailable' in pr && shouldShowAutoMerger(pr)) {
      // events = events.concat(getAutoMergeOptions(pr));
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

    return html`<row-element data="${data}" events="${events}"></row-element>
    <auto-merger pr="${pr}"></auto-merger>`;
  }
}

export class PullRequestList extends BaseElement {
  @property() data: api.PullRequest[] = [];
  @property() filter?: FilterState;
  @property() loading = false;
  @property() emptyMessageTitle = '';
  @property() emptyMessageDescription = '';

  prTemplate(pr: api.PullRequest) {
    return html`<pull-request data="${pr}"></pull-request>`;
  }

  private applyFilter(filter: FilterState|undefined, prList: api.PullRequest[]):
      api.PullRequest[] {
    if (!filter) {
      return prList;
    }
    return prList.filter((pr) => {
      const {type} = statusToDisplay(pr);
      const typeSelected = filter[type];
      return typeSelected;
    });
  }

  render() {
    const listToDisplay = this.applyFilter(this.filter, this.data);

    if (!listToDisplay.length) {
      return createEmptyMessage(
          this.emptyMessageTitle, this.emptyMessageDescription);
    }
    return html`${listToDisplay.map(this.prTemplate)}`;
  }
}

customElements.define('pull-request', PullRequest);
customElements.define('pull-request-list', PullRequestList);

export function statusToDisplay(pr: api.PullRequest): StatusDisplay {
  switch (pr.status.type) {
    case 'UnknownStatus':
      return {text: '', type: 'activity'};
    case 'NoActionRequired':
      return {text: 'No action required', type: 'activity'};
    case 'NewActivity':
      return {text: 'New activity', type: 'activity'};
    case 'StatusChecksPending':
      return {text: 'Status checks pending', type: 'activity'};
    case 'WaitingReview':
      return {
        text: `Waiting on ${pr.status.reviewers.join(', ')}`,
        type: 'activity'
      };
    case 'ChangesRequested':
      return {text: 'Changes requested', type: 'activity'};
    case 'PendingChanges':
      return {text: 'Waiting on you', type: 'actionable'};
    case 'PendingMerge':
      return {text: 'Ready to merge', type: 'complete'};
    case 'StatusChecksFailed':
      return {text: 'Status checks failed', type: 'actionable'};
    case 'NoReviewers':
      return {text: 'No reviewers assigned', type: 'actionable'};
    case 'ReviewRequired':
      return {text: 'Pending your review', type: 'actionable'};
    case 'ApprovalRequired':
      return {text: 'Pending your approval', type: 'actionable'};
    case 'MergeRequired':
      return {text: 'Requires merging', type: 'actionable'};
    default:
      const unknown: never = pr.status;
      throw new Error(`Unknown PullRequestStatus: ${unknown}`);
  }
}
