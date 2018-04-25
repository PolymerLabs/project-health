import '../components/empty-message.js';
import '../components/row-element.js';

import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import * as api from '../../../../types/api.js';
import {createEmptyMessage} from '../components/empty-message.js';
import {StatusDisplay} from '../components/row-element.js';

import {FilterState} from './filter-controller.js';


export function genericPrListTemplate(
    prList: api.PullRequest[],
    filter: FilterState|undefined,
    emptyMessageTitle: string,
    emptyMessageDescription: string) {
  prList = applyFilter(filter, prList);
  if (prList.length) {
    return html`${prList.map((pr) => {
      return html`<pull-request data=${pr}></pull-request>`;
    })}`;
  } else {
    return createEmptyMessage(emptyMessageTitle, emptyMessageDescription);
  }
}

/**
 * Applies a filter to a PR list
 */
function applyFilter<T extends api.PullRequest>(
    filter: FilterState|undefined, prList: T[]): T[] {
  if (!filter) {
    return prList;
  }
  return prList.filter((pr) => {
    const {type} = statusToDisplay(pr);
    const typeSelected = filter[type];
    return typeSelected;
  });
}

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
