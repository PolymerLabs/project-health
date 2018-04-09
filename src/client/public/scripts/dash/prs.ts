import '../components/empty-message.js';

import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api.js';
import {genericDashboardRowEventTemplate, genericDashboardRowTemplate, StatusDisplay} from '../components/dashboard-row.js';
import {createEmptyMessage} from '../components/empty-message.js';

import {getAutoMergeOptions} from './auto-merge-events.js';
import {FilterState} from './filter-controller.js';
import {parseAsEventModel} from './pr-event.js';


export function genericPrListTemplate(
    prList: api.PullRequest[],
    filter: FilterState|undefined,
    emptyMessageTitle: string,
    emptyMessageDescription: string) {
  prList = applyFilter(filter, prList);
  if (prList.length) {
    return html`${prList.map((pr) => {
      return getPRRowTemplate(pr);
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
    const typeDisabled = filter[type];
    return !typeDisabled;
  });
}

export function outgoingPrListTemplate(
    prList: api.OutgoingPullRequest[],
    filter: FilterState|undefined,
    emptyMessageTitle: string,
    emptyMessageDescription: string) {
  prList = applyFilter(filter, prList);
  if (prList.length) {
    return html`${prList.map((pr) => {
      return outgoingPrTemplate(pr);
    })}`;
  } else {
    return createEmptyMessage(emptyMessageTitle, emptyMessageDescription);
  }
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

export function outgoingPrTemplate(pr: api.OutgoingPullRequest) {
  const autoMergeEvents = getAutoMergeOptions(pr as api.OutgoingPullRequest);
  return getPRRowTemplate(pr, autoMergeEvents);
}

function getPRRowTemplate(
    pr: api.PullRequest, automergeEvents?: TemplateResult[]) {
  const prEvents = pr.events.map(
      (event) => genericDashboardRowEventTemplate(parseAsEventModel(event)));

  let events = prEvents;
  if (automergeEvents) {
    events = events.concat(automergeEvents);
  }

  return genericDashboardRowTemplate(
      {
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
      },
      [],
      events);
}
