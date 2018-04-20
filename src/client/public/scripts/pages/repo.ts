import '../components/filter-legend.js';

import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api.js';
import {BaseElement, property} from '../components/base-element.js';
import {FilterLegendEvent, FilterLegendItem} from '../components/filter-legend.js';
import {filterController, FilterId} from '../dash/filter-controller.js';
import {genericIssueListTemplate} from '../dash/issues.js';

class RepoPage extends BaseElement {
  @property({attribute: true}) urlparams = '';
  @property() untriaged: api.Issue[] = [];
  private cachedId = '';
  private filters: {[key: string]: [FilterLegendItem]} = {
    'untriaged-issues': [
      {type: 'actionable', description: 'Untriaged'},
    ],
  };

  constructor() {
    super();
    filterController.createFilter(
        'untriaged-issues', this.filters['untriaged-issues']);
  }

  private async updateParams(urlparams: string) {
    const parts = urlparams.split('/');
    await this.fetchData(parts[0], parts[1]);
  }

  private clearData() {
    this.untriaged = [];
  }

  private updateFilter(id: FilterId, event: CustomEvent) {
    const data = event.detail as FilterLegendEvent;
    filterController.updateFilter(id, data.state);
    this.requestRender();
  }

  private async fetchData(owner: string, repo: string) {
    const id = `${owner}/${repo}`;
    if (this.cachedId === id) {
      return;
    }

    this.cachedId = id;

    this.clearData();

    const response = await fetch(
        `/api/issues/untriaged/${owner}/${repo}`, {credentials: 'include'});
    const data = (await response.json()).data as api.IssuesResponse;
    this.untriaged = data.issues;
  }

  render(): TemplateResult {
    this.updateParams(this.urlparams);

    return html`
<div class="title-container">
  <h1 id="page-header">${this.urlparams}</h1>
</div>

<div id="assigned-issues">
  <h2>
    Untriaged issues
    <filter-legend on-legend-change="${
        this.updateFilter.bind(this, 'untriaged-issues')}" filters="${
        this.filters['untriaged-issues']}"></filter-legend>
  </h2>
  <div class='assigned-issues__list pr-list'>
        ${
        genericIssueListTemplate(
            this.untriaged,
            filterController.getFilter('untriaged-issues'),
            'No untriaged issues',
            'When there are untriaged issues, they\'ll appear here.')}
  </div>
</div>`;
  }
}

customElements.define('repo-page', RepoPage);
