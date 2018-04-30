import './row-element.js';

import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import * as api from '../../../../types/api.js';
import {FilterState} from '../dash/filter-controller.js';

import {BaseElement, property} from './base-element.js';
import {createEmptyMessage} from './empty-message.js';
import {StatusDisplay} from './row-element.js';
import {RowData} from './row-element.js';

export class IssueElement extends BaseElement {
  @property() data?: api.Issue;

  render() {
    if (!this.data) {
      return html``;
    }
    const issue = this.data;

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
}

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
    case 'Untriaged':
      return {text: 'Untriaged', type: 'actionable'};
    case 'UnknownStatus':
      return {text: '', type: 'activity'};
    case 'Unassigned':
      return {text: 'Unassigned', type: 'actionable'};
    case 'AssignedTo':
      return {
        text: `Assigned to ${issue.status.users.join(', ')}`,
        type: 'activity'
      };
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

export class IssueList extends BaseElement {
  @property() data: api.Issue[] = [];
  @property() filter?: FilterState;
  @property() loading = true;
  @property() emptyMessageTitle = '';
  @property() emptyMessageDescription = '';

  issueTemplate(pr: api.Issue) {
    return html`<issue-element data="${pr}"></issue-element>`;
  }

  private applyFilter(filter: FilterState|undefined, issueList: api.Issue[]):
      api.Issue[] {
    if (!filter) {
      return issueList;
    }
    return issueList.filter((issue) => {
      const {type} = statusToDisplay(issue);
      const typeSelected = filter[type];
      return typeSelected;
    });
  }

  render() {
    if (this.loading) {
      return html`Loading...`;
    }

    const listToDisplay = this.applyFilter(this.filter, this.data);

    if (!listToDisplay.length) {
      return createEmptyMessage(
          this.emptyMessageTitle, this.emptyMessageDescription);
    }
    return html`${listToDisplay.map(this.issueTemplate)}`;
  }
}

customElements.define('issue-element', IssueElement);
customElements.define('issue-list', IssueList);
