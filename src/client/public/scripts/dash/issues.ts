import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import * as api from '../../../../types/api.js';
import {genericDashboardRowTemplate, StatusDisplay} from '../components/dashboard-row.js';
import {EmptyMessage, emptyTemplate} from '../components/empty-message.js';

function statusToDisplay(): StatusDisplay {
  return {text: 'Assigned to you', type: 'actionable'};
}

export function genericIssueListTemplate(
    issues: api.Issue[],
    newlyActionableIssues: string[],
    emptyMessage: EmptyMessage) {
  if (issues.length) {
    return html`${issues.map((issue) => {
      const isNewlyActionable = newlyActionableIssues &&
          newlyActionableIssues.indexOf(issue.id) !== -1;
      return genericDashboardRowTemplate(
          {
            status: statusToDisplay(),
            createdAt: issue.createdAt,
            author: issue.author,
            avatarUrl: issue.avatarUrl,
            url: issue.url,
            title: issue.title,
            owner: issue.owner,
            repo: issue.repo,
          },
          isNewlyActionable);
    })}`;
  } else {
    return emptyTemplate(emptyMessage);
  }
}
