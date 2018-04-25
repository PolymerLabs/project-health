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
  private fetches: Set<AbortController> = new Set();

  private owner = '';
  private repo = '';

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
    this.filteredIssues = [];
    for (const controller of this.fetches.values()) {
      controller.abort();
    }
  }

  private updateFilter(id: FilterId, event: CustomEvent<FilterLegendEvent>) {
    filterController.updateFilter(id, event.detail.state);
    this.requestRender();
  }

  /**
   * This wraps fetch to keep track of pending fetches so they can be aborted if
   * necessary.
   */
  private async cancelableFetch(input: RequestInfo): Promise<Response|null> {
    const controller = new AbortController();
    this.fetches.add(controller);
    try {
      const response = await fetch(input, {
        credentials: 'include',
        signal: controller.signal,
      });

      return response;
    } catch {
      return null;
    } finally {
      this.fetches.delete(controller);
    }
  }

  private async fetchUntriaged() {
    const response = await this.cancelableFetch(
        `/api/issues/untriaged/${this.owner}/${this.repo}`)
    if (!response) {
      return;
    }
    const data = (await response.json()).data as api.IssuesResponse;
    this.untriaged = data.issues;
  }

  private async fetchLabels() {
    const response = await this.cancelableFetch(
        `/api/issues/labels/${this.owner}/${this.repo}`);
    if (!response) {
      return;
    }
    const data = (await response.json()).data as api.LabelsResponse;
    this.labels = data.labels;
  }

  private async fetchFilteredIssues(labels: string[]) {
    const response = await this.cancelableFetch(
        `/api/issues/by-labels/${this.owner}/${this.repo}/${labels.join(',')}`);
    if (!response) {
      return;
    }
    const data = (await response.json()).data as api.IssuesResponse;
    this.filteredIssues = data.issues;
  }

  private async labelFilterChanged(event:
                                       CustomEvent<LabelFilterChangedEvent>) {
    const labels = event.detail.selectedLabels;
    this.fetchFilteredIssues(labels);
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
    this.fetchFilteredIssues([]);
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
