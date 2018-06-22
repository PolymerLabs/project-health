import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api.js';
import {trackEvent} from '../utils/track-event.js';


import {BaseElement, property} from './base-element.js';

export class AutoMerger extends BaseElement {
  @property() pr?: api.OutgoingPullRequest;
  @property() open = false;
  @property() selected?: api.MergeType;

  private renderOption(
      text: string|TemplateResult,
      clickHandler: (event: MouseEvent) => {},
      isOption: boolean,
      extraClasses: string[] = []) {
    if (text === 'Manual merge') {
      extraClasses.push('red-dot');
    }

    return html`<div class$="dashboard-row-event ${extraClasses.join(' ')}">
<time class="dashboard-row-event__time"></time>

<div class="dashboard-row-event__bullet">
  <svg width="40" height="100%">
    <circle cx="20.5" cy="6" r="4.5"></circle>
  </svg>
</div>
<div class="dashboard-row-event__title">
  <button class$="${
        isOption ? 'dashboard-row-event__option' :
                   'dashboard-row-event__action'}" on-click="${clickHandler}">
    ${text}
  </button>
</div>
</div>
    `;
  }

  private renderSelectableOption(option: api.MergeType) {
    return this.renderOption(
        optionText[option],
        this.selectOption.bind(this, option),
        true,
        ['disconnected']);
  }

  private toggleOpen() {
    this.open = !this.open;
  }

  private selectOption(option: api.MergeType) {
    if (!this.pr) {
      return;
    }

    this.selected = option;
    this.toggleOpen();

    // Async tracking of an event
    trackEvent('automerge', 'selection', option);

    // TODO: Would be good to mark this change as disabled until the network
    // request has finished.
    fetch('/api/auto-merge/set-merge-option/', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        owner: this.pr.owner,
        repo: this.pr.repo,
        number: this.pr.number,
        automergeOption: option,
      }),
      headers: {
        'Content-Type': 'application/json',
      }
    }).then(async (response) => {
      if (!response.ok) {
        const reponseText = await response.text();
        console.error('Unable to set auto merge option', reponseText);
        return;
      }
    });
  }

  render() {
    if (!this.pr || !shouldShowAutoMerger(this.pr)) {
      return html``;
    }

    if (!this.selected && this.pr.automergeSelection &&
        this.pr.automergeSelection.mergeType) {
      this.selected = this.pr.automergeSelection.mergeType;
    }

    const titleText =
        this.selected ? optionText[this.selected] : 'Auto merge available';
    const titleTemplate = this.renderOption(
        titleText,
        this.toggleOpen.bind(this),
        false,
        this.selected ? [] : ['disconnected']);

    // Just render the title option, which opens the selection menu.
    if (!this.open) {
      return titleTemplate;
    }

    // Render all available options.
    const options = [titleTemplate];

    if (this.selected !== 'manual') {
      options.push(this.renderSelectableOption('manual'));
    }

    if (this.pr.repoDetails!.allow_merge_commit && this.selected !== 'merge') {
      options.push(this.renderSelectableOption('merge'));
    }

    if (this.pr.repoDetails!.allow_rebase_merge && this.selected !== 'rebase') {
      options.push(this.renderSelectableOption('rebase'));
    }

    if (this.pr.repoDetails!.allow_squash_merge && this.selected !== 'squash') {
      options.push(this.renderSelectableOption('squash'));
    }

    return html`${options}`;
  }
}

const optionText = {
  manual: 'Manual merge',
  merge: html`Auto <i>merge</i> when status checks pass`,
  squash: html`Auto <i>squash and merge</i> when status checks pass`,
  rebase: html`Auto <i>rebase and merge</i> when status checks pass`,
};

export function shouldShowAutoMerger(pr: api.OutgoingPullRequest): boolean {
  if (!pr.automergeAvailable) {
    return false;
  }

  if (pr.status.type !== 'StatusChecksPending') {
    return false;
  }

  if (!pr.repoDetails) {
    return false;
  }

  return true;
}

customElements.define('auto-merger', AutoMerger);
