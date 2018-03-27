import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api.js';
import {genericDashboardRowEventTemplate, genericDashboardRowTemplate, StatusDisplay} from '../components/dashboard-row.js';
import {EmptyMessage, emptyTemplate} from '../components/empty-message.js';

import {getAutoMergeOptions} from './auto-merge-events.js';
import {parseAsEventModel} from './pr-event.js';

export function genericPrListTemplate(
    prList: api.PullRequest[],
    newlyActionablePRs: string[],
    emptyMessage: EmptyMessage) {
  if (prList.length) {
    return html`${prList.map((pr) => {
      const isNewlyActionable =
          newlyActionablePRs && newlyActionablePRs.indexOf(pr.id) !== -1;
      return getPRRowTemplate(pr, isNewlyActionable);
    })}`;
  } else {
    return emptyTemplate(emptyMessage);
  }
}

export function outgoingPrListTemplate(
    prList: api.OutgoingPullRequest[],
    newlyActionablePRs: string[],
    emptyMessage: EmptyMessage) {
  if (prList.length) {
    return html`${prList.map((pr) => {
      const isNewlyActionable =
          newlyActionablePRs && newlyActionablePRs.indexOf(pr.id) !== -1;
      return outgoingPrTemplate(pr, isNewlyActionable);
    })}`;
  } else {
    return emptyTemplate(emptyMessage);
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
      return {
        text: 'Ready to merge',
        actionable: true,
        className: 'pr-status__merge',
      };
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

export function outgoingPrTemplate(
    pr: api.OutgoingPullRequest, newlyActionable: boolean) {
  const autoMergeEvents = getAutoMergeOptions(pr as api.OutgoingPullRequest);
  return getPRRowTemplate(pr, newlyActionable, autoMergeEvents);
}

function getPRRowTemplate(
    pr: api.PullRequest,
    newlyActionable: boolean,
    automergeEvents?: TemplateResult[]) {
  const prEvents = pr.events.map(
      (event) => genericDashboardRowEventTemplate(parseAsEventModel(event)));

  let events = prEvents;
  if (automergeEvents) {
    events = events.concat(automergeEvents);
  }

  return genericDashboardRowTemplate(
      {
        createdAt: pr.createdAt,
        author: pr.author,
        avatarUrl: pr.avatarUrl,
        url: pr.url,
        title: pr.title,
        owner: pr.owner,
        repo: pr.repo,
        status: statusToDisplay(pr),
      },
      newlyActionable,
      events);
}
