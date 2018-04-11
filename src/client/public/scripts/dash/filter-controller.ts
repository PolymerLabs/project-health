export type FilterState = {
  [type: string]: boolean
};

export type FilterId =
    'outgoing-prs'|'incoming-prs'|'assigned-issues'|'issue-activity';

export class FilterController {
  private filters: Map<FilterId, FilterState>;

  constructor() {
    this.filters = new Map();
  }

  createFilter(id: FilterId, filters: Array<{type: string}>) {
    const state: FilterState = {};
    for (const filter of filters) {
      state[filter.type] = false;
    }
    this.filters.set(id, state);
  }

  getFilter(id: FilterId): FilterState|undefined {
    return this.filters.get(id);
  }

  updateFilter(id: FilterId, config: FilterState) {
    this.filters.set(id, config);
  }
}
