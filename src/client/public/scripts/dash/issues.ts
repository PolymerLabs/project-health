import '../components/empty-message.js';

import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import * as api from '../../../../types/api.js';
import {genericDashboardRowTemplate, StatusDisplay} from '../components/dashboard-row.js';

import {createEmptyMessage} from '../components/empty-message.js';

import {FilterState} from './filter-controller.js';

function statusToDisplay(): StatusDisplay {
  return {text: 'Assigned to you', type: 'actionable'};
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

export function genericIssueListTemplate(
    issues: api.Issue[],
    filter: FilterState|undefined,
    emptyMessageTitle: string,
    emptyMessageDescription: string) {
  // Issuses currently are only of one type.
  const filtered = filter && filter['actionable'];
  if (issues.length && !filtered) {
    return html`${issues.map((issue) => {
      return genericDashboardRowTemplate(
          {
            id: issue.id,
            status: statusToDisplay(),
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
