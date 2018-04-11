import '../components/empty-message.js';

import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import * as api from '../../../../types/api.js';
import {genericDashboardRowTemplate, StatusDisplay} from '../components/dashboard-row.js';

import {createEmptyMessage} from '../components/empty-message.js';

import {FilterState} from './filter-controller.js';

function statusToDisplay(issue: api.Issue): StatusDisplay {
  switch (issue.status.type) {
    case 'Assigned':
      return {text: 'Assigned to you', type: 'actionable'};
    case 'Author':
      return {
        text: 'You filed this issue',
        type: issue.hasNewActivity ? 'actionable' : 'passive'
      };
    case 'Involved':
      return {
        text: 'You are involved with this issue',
        type: issue.hasNewActivity ? 'actionable' : 'passive'
      };
    case 'UnknownStatus':
      return {text: '', type: 'activity'};
    default:
      const unknown: never = issue.status;
      throw new Error(`Unknown PullRequestStatus: ${unknown}`);
  }
}

function popularityTemplate(popularity: api.Popularity) {
  return html`
  <div class="issue-info">
    <div class="issue-info-item issue-popularity" score$="${popularity}">
      <div class="issue-info-item__visual">
        <div class="issue-popularity__fire"></div>
        <div class="issue-popularity__fire"></div>
        <div class="issue-popularity__fire"></div>
        <div class="issue-popularity__fire"></div>
      </div>
      <div class="issue-info-item__description">popularity</div>
    </div>
  </div>
  `;
}

/**
 * Applies a filter to an array of issues
 */
function applyFilter(
    filter: FilterState|undefined, issues: api.Issue[]): api.Issue[] {
  if (!filter) {
    return issues;
  }
  return issues.filter((issue) => {
    const {type} = statusToDisplay(issue);
    const typeDisabled = filter[type];
    return !typeDisabled;
  });
}

export function genericIssueListTemplate(
    issues: api.Issue[],
    filter: FilterState|undefined,
    emptyMessageTitle: string,
    emptyMessageDescription: string) {
  issues = applyFilter(filter, issues);

  if (issues.length) {
    return html`${issues.map((issue) => {
      return genericDashboardRowTemplate(
          {
            id: issue.id,
            status: statusToDisplay(issue),
            createdAt: issue.createdAt,
            author: issue.author,
            avatarUrl: issue.avatarUrl,
            url: issue.url,
            title: issue.title,
            owner: issue.owner,
            repo: issue.repo,
            hasNewActivity: issue.hasNewActivity,
          },
          [popularityTemplate(issue.popularity)]);
    })}`;
  } else {
    return createEmptyMessage(emptyMessageTitle, emptyMessageDescription);
  }
}
