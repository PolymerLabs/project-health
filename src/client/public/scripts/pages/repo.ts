import '../components/filter-legend.js';
import '../components/label-filter.js';

import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api.js';
import {BaseElement, property} from '../components/base-element.js';
import {FilterLegendEvent, FilterLegendItem} from '../components/filter-legend.js';
import {LabelFilterChangedEvent} from '../components/label-filter.js';
import {filterController, FilterId} from '../dash/filter-controller.js';
import {genericIssueListTemplate} from '../dash/issues.js';

class RepoPage extends BaseElement {
  @property({attribute: true}) urlparams = '';
  @property() untriaged: api.Issue[] = [];
  @property() filteredIssues: api.Issue[] = [];
  @property() labels: api.Label[] = [];

  private owner: string = '';
  private repo: string = '';

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

  private async updateParams(urlParams: string) {
    const parts = urlParams.split('/');
    await this.fetchData(parts[0], parts[1]);
  }

  private clearData() {
    this.untriaged = [];
    this.labels = [];
  }

  private updateFilter(id: FilterId, event: CustomEvent<FilterLegendEvent>) {
    filterController.updateFilter(id, event.detail.state);
    this.requestRender();
  }

  private async fetchUntriaged() {
    const response = await fetch(
        `/api/issues/untriaged/${this.owner}/${this.repo}`,
        {credentials: 'include'});
    const data = (await response.json()).data as api.IssuesResponse;
    this.untriaged = data.issues;
  }

  private async fetchLabels() {
    const response = await fetch(
        `/api/issues/labels/${this.owner}/${this.repo}`,
        {credentials: 'include'});
    const data = (await response.json()).data as api.LabelsResponse;
    this.labels = data.labels;
  }

  private async labelFilterChanged(event:
                                       CustomEvent<LabelFilterChangedEvent>) {
    const labels = event.detail.selectedLabels;
    if (labels.length === 0) {
      this.filteredIssues = [];
      return;
    }

    const response = await fetch(
        `/api/issues/by-labels/${this.owner}/${this.repo}/${labels.join(',')}`,
        {credentials: 'include'});
    const data = (await response.json()).data as api.IssuesResponse;
    this.filteredIssues = data.issues;
  }

  private async fetchData(owner: string, repo: string) {
    const id = `${owner}/${repo}`;
    if (this.cachedId === id) {
      return;
    }

    this.cachedId = id;
    this.owner = owner;
    this.repo = repo;

    this.clearData();

    this.fetchUntriaged();
    this.fetchLabels();
  }

  render(): TemplateResult {
    this.updateParams(this.urlparams);

    return html`
<div class="title-container">
  <h1 id="page-header">${this.urlparams}</h1>
</div>

<div id="untriaged-issues">
  <h2>
    Untriaged issues
    <filter-legend on-legend-change="${
        this.updateFilter.bind(this, 'untriaged-issues')}" filters="${
        this.filters['untriaged-issues']}"></filter-legend>
  </h2>
  <div class="pr-list">
        ${
        genericIssueListTemplate(
            this.untriaged,
            filterController.getFilter('untriaged-issues'),
            'No untriaged issues',
            'When there are untriaged issues, they\'ll appear here.')}
  </div>
</div>
<div id="all-issues">
  <h2>Issues</h2>
  <div class="pr-list">
    <label-filter labels="${this.labels}" on-label-filter-changed="${
        this.labelFilterChanged.bind(this)}"></label-filter>
    <div class="pr-list">
      ${
        genericIssueListTemplate(
            this.filteredIssues,
            undefined,
            'No issues matching selected filters',
            'Select labels to view issues')}
    </div>
  </div>
</div>`;
  }
}

customElements.define('repo-page', RepoPage);
