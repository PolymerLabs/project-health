import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api.js';
import {DashboardRowEventData, genericDashboardRowEventTemplate} from '../components/dashboard-row.js';
import {trackEvent} from '../utils/track-event.js';


// TODO: This should be self contained to each auto-merge instance, not
// a global for all auto-merge instances
const automergeOpenStates: {[prId: string]: boolean} = {};

function selectAutomergeOpt(
    pr: api.OutgoingPullRequest,
    optionSelected: 'manual'|'merge'|'squash'|'rebase',
) {
  // Async tracking of an event
  trackEvent('automerge', 'selection', optionSelected);

  // TODO: Would be good to mark this change as disabled until the network
  // request has finished.
  fetch('/api/auto-merge/set-merge-option/', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({
      owner: pr.owner,
      repo: pr.repo,
      number: pr.number,
      automergeOption: optionSelected,
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

  if (!pr.automergeOpts) {
    pr.automergeOpts = {
      mergeType: optionSelected,
    };
  } else {
    pr.automergeOpts.mergeType = optionSelected;
  }

  // Force close
  automergeOpenStates[pr.id] = false;
  requestRender();
}

function requestRender() {
  window.postMessage(
      {
        action: 'render-outgoing-request',
      },
      window.location.origin,
  );
}

export function getAutoMergeOptions(pr: api.OutgoingPullRequest):
    TemplateResult[] {
  if (!pr.automergeAvailable) {
    return [];
  }

  const isOpen =
      automergeOpenStates[pr.id] ? automergeOpenStates[pr.id] : false;
  const toggleCb = () => {
    automergeOpenStates[pr.id] = !isOpen;
    requestRender();
  };

  const statusType = pr.status.type;
  if (statusType !== 'StatusChecksPending') {
    return [];
  }

  if (pr.mergeable !== 'MERGEABLE') {
    return [];
  }

  if (!pr.repoDetails) {
    return [];
  }

  const optionText = {
    manual: 'Manual merge',
    merge: html`Auto <i>merge</i> when status checks pass`,
    squash: html`Auto <i>squash and merge</i> when status checks pass`,
    rebase: html`Auto <i>rebase and merge</i> when status checks pass`,
  };

  const mergeOptions = [];

  const selectedOption = pr.automergeOpts ? pr.automergeOpts.mergeType : null;
  const selectedOptionText =
      selectedOption ? optionText[selectedOption] : 'Auto merge available';
  const dotColor = selectedOption === 'manual' ? 'red-dot' : 'blue-dot';
  const classes = [dotColor];
  if (!pr.automergeOpts) {
    classes.push('disconnected');
  }

  const titleOption: DashboardRowEventData = {
    text: html`<button class="dashboard-row-event__action" on-click="${
        () => toggleCb()}">${selectedOptionText}</button>`,
    classes,
  };
  mergeOptions.push(genericDashboardRowEventTemplate(titleOption));

  if (!isOpen) {
    return mergeOptions;
  }

  if (selectedOption !== 'manual') {
    const manualClick = () => selectAutomergeOpt(pr, 'manual');
    const manualData: DashboardRowEventData = {
      text: html`<button class="dashboard-row-event__option" on-click="${
          manualClick}">${optionText.manual}</button>`,
      classes: ['disconnected', 'red-dot']
    };
    mergeOptions.push(genericDashboardRowEventTemplate(manualData));
  }

  if (pr.repoDetails.allow_merge_commit && selectedOption !== 'merge') {
    const mergeClick = () => selectAutomergeOpt(pr, 'merge');
    const mergeData: DashboardRowEventData = {
      text: html`<button class="dashboard-row-event__option" on-click="${
          mergeClick}">${optionText.merge}</button>`,
      classes: ['disconnected', 'blue-dot']
    };
    mergeOptions.push(genericDashboardRowEventTemplate(mergeData));
  }

  if (pr.repoDetails.allow_squash_merge && selectedOption !== 'squash') {
    const squashClick = () => selectAutomergeOpt(pr, 'squash');
    const rebaseData: DashboardRowEventData = {
      text: html`<button class="dashboard-row-event__option" on-click="${
          squashClick}">${optionText.squash}</button>`,
      classes: ['disconnected', 'blue-dot']
    };
    mergeOptions.push(genericDashboardRowEventTemplate(rebaseData));
  }

  if (pr.repoDetails.allow_rebase_merge && selectedOption !== 'rebase') {
    const rebaseClick = () => selectAutomergeOpt(pr, 'rebase');
    const rebaseData: DashboardRowEventData = {
      text: html`<button class="dashboard-row-event__option" on-click="${
          rebaseClick}">${optionText.rebase}</button>`,
      classes: ['disconnected', 'blue-dot']
    };
    mergeOptions.push(genericDashboardRowEventTemplate(rebaseData));
  }

  return mergeOptions;
}
