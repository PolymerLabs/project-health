import '../components/empty-message.js';
import '../components/row-element.js';

import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import * as api from '../../../../types/api.js';
import {createEmptyMessage} from '../components/empty-message.js';
import {RowData, StatusDisplay} from '../components/row-element.js';

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
        <i class="material-icons-extended issue-popularity__fire">whatshot</i>
        <i class="material-icons-extended issue-popularity__fire">whatshot</i>
        <i class="material-icons-extended issue-popularity__fire">whatshot</i>
        <i class="material-icons-extended issue-popularity__fire">whatshot</i>
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
    const typeSelected = filter[type];
    return typeSelected;
  });
}

function issueTemplate(issue: api.Issue) {
  const data: RowData = {
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
  };
  return html`
<row-element data="${data}"
             extraHeaderData="${[popularityTemplate(issue.popularity)]}">
</row-element>`;
}

export function genericIssueListTemplate(
    issues: api.Issue[],
    filter: FilterState|undefined,
    emptyMessageTitle: string,
    emptyMessageDescription: string) {
  issues = applyFilter(filter, issues);

  if (issues.length) {
    return html`${issues.map((issue) => issueTemplate(issue))}`;
  } else {
    return createEmptyMessage(emptyMessageTitle, emptyMessageDescription);
  }
}
