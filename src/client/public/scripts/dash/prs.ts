import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api.js';

import {getAutoMergeOptions} from './auto-merge-events.js';
import {eventTemplate, parseAsEventModel} from './pr-event.js';
import {timeToString} from './utils/time-to-string.js';

type StatusDisplay = {
  actionable: boolean; text: string;
};

export function genericPrListTemplate(
    prList: api.PullRequest[],
    newlyActionablePRs: string[],
    emptyMessage: string) {
  if (prList.length) {
    return html`${prList.map((pr) => {
      const isNewlyActionable =
          newlyActionablePRs && newlyActionablePRs.indexOf(pr.id) !== -1;
      return genericPrTemplate(pr, isNewlyActionable);
    })}`;
  } else {
    return html
    `<div class="pr-list__empty-message">${emptyMessage}</div>`;
  }
}

export function outgoingPrListTemplate(
    prList: api.OutgoingPullRequest[],
    newlyActionablePRs: string[],
    emptyMessage: string) {
  if (prList.length) {
    return html`${prList.map((pr) => {
      const isNewlyActionable =
          newlyActionablePRs && newlyActionablePRs.indexOf(pr.id) !== -1;
      return outgoingPrTemplate(pr, isNewlyActionable);
    })}`;
  } else {
    return html
    `<div class="pr-list__empty-message">${emptyMessage}</div>`;
  }
}

export function statusToDisplay(pr: api.PullRequest): StatusDisplay {
  switch (pr.status.type) {
    case 'UnknownStatus':
      return {text: '', actionable: false};
    case 'NoActionRequired':
      return {text: 'No action required', actionable: false};
    case 'NewActivity':
      return {text: 'New activity', actionable: false};
    case 'StatusChecksPending':
      return {text: 'Status checks pending', actionable: false};
    case 'WaitingReview':
      return {
        text: `Waiting on ${pr.status.reviewers.join(', ')}`,
        actionable: false
      };
    case 'ChangesRequested':
      return {text: 'Changes requested', actionable: false};
    case 'PendingChanges':
      return {text: 'Waiting on you', actionable: true};
    case 'PendingMerge':
      return {text: 'Ready to merge', actionable: true};
    case 'StatusChecksFailed':
      return {text: 'Status checks failed', actionable: true};
    case 'NoReviewers':
      return {text: 'No reviewers assigned', actionable: true};
    case 'ReviewRequired':
      return {text: 'Pending your review', actionable: true};
    case 'ApprovalRequired':
      return {text: 'Pending your approval', actionable: true};
    case 'MergeRequired':
      return {text: 'Requires merging', actionable: true};
    default:
      const unknown: never = pr.status;
      throw new Error(`Unknown PullRequestStatus: ${unknown}`);
  }
}

export function genericPrTemplate(
    pr: api.PullRequest,
    isNewlyActionable: boolean,
    extraEvents?: TemplateResult[],
) {
  const status = statusToDisplay(pr);
  const prClasses = ['pr'];

  if (isNewlyActionable) {
    prClasses.push('is-newly-actionable');
  }
  return html`
      <div class$="${prClasses.join(' ')}">
        <div class="pr-header">
          <div class="pr-author">
            <div class="pr-author__name">${pr.author}</div>
            <time class="pr-author__creation-time" datetime="${
      new Date(pr.createdAt).toISOString()}">${
      timeToString(pr.createdAt)}</time>
          </div>

          <div class="pr-avatar">
            <img class="pr-avatar__img" src="${pr.avatarUrl}">
          </div>

          <a class="pr-body" href="${pr.url}" target="_blank">
            <div class="small-heading pr-status">
              <span class$="pr-status__msg ${
      status.actionable ? 'actionable' : ''}">${status.text}</span>
            </div>
            <div class="pr-info">
              <span class="pr-info__repo-name">${pr.owner}/${pr.repo}</span>
              <span class="pr-info__title">${pr.title}</span>
            </div>
          </a>
        </div>
        ${pr.events.map((event) => eventTemplate(parseAsEventModel(event)))}
        ${extraEvents}
      </div>`;
}

export function outgoingPrTemplate(
    pr: api.OutgoingPullRequest, newlyActionable: boolean) {
  const autoMergeEvents = getAutoMergeOptions(pr as api.OutgoingPullRequest);
  return genericPrTemplate(pr, newlyActionable, autoMergeEvents);
}
