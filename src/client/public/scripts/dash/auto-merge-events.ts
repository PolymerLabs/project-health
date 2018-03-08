import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api.js';

import {EventModel, eventTemplate} from './pr-event.js';

// TODO: This should be self contained to each auto-merge instance, not
// a global for all auto-merge instances
const automergeOpenStates: {[prId: string]: boolean} = {};

function selectAutomergeOpt(
    pr: api.OutgoingPullRequest,
    optionSelected: 'manual'|'merge'|'squash'|'rebase',
) {
  // TODO: Would be good to mark this change as disabled until the network
  // request has finished.
  fetch('/api/auto-merge/set-merge-option/', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({
      prId: pr.id,
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
        type: 'render-request',
      },
      window.location.origin,
  );
}

export function getAutoMergeOptions(pr: api.OutgoingPullRequest):
    TemplateResult[] {
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

  const titleOption: EventModel = {
    time: null,
    text: html`<button class="pr-event__action" on-click="${
        () => toggleCb()}">${selectedOptionText}</button>`,
    url: null,
    classes,
  };
  mergeOptions.push(eventTemplate(titleOption));

  if (!isOpen) {
    return mergeOptions;
  }

  if (selectedOption !== 'manual') {
    const manualClick = () => selectAutomergeOpt(pr, 'manual');
    const manualData: EventModel = {
      time: null,
      text: html`<button class="pr-event__option" on-click="${manualClick}">${
          optionText.manual}</button>`,
      url: null,
      classes: ['disconnected', 'red-dot']
    };
    mergeOptions.push(eventTemplate(manualData));
  }

  if (pr.repoDetails.allow_merge_commit && selectedOption !== 'merge') {
    const mergeClick = () => selectAutomergeOpt(pr, 'merge');
    const mergeData: EventModel = {
      time: null,
      text: html`<button class="pr-event__option" on-click="${mergeClick}">${
          optionText.merge}</button>`,
      url: null,
      classes: ['disconnected', 'blue-dot']
    };
    mergeOptions.push(eventTemplate(mergeData));
  }

  if (pr.repoDetails.allow_squash_merge && selectedOption !== 'squash') {
    const squashClick = () => selectAutomergeOpt(pr, 'squash');
    const rebaseData = {
      time: null,
      text: html`<button class="pr-event__option" on-click="${squashClick}">${
          optionText.squash}</button>`,
      url: null,
      classes: ['disconnected', 'blue-dot']
    };
    mergeOptions.push(eventTemplate(rebaseData));
  }

  if (pr.repoDetails.allow_rebase_merge && selectedOption !== 'rebase') {
    const rebaseClick = () => selectAutomergeOpt(pr, 'rebase');
    const rebaseData = {
      time: null,
      text: html`<button class="pr-event__option" on-click="${rebaseClick}">${
          optionText.rebase}</button>`,
      url: null,
      classes: ['disconnected', 'blue-dot']
    };
    mergeOptions.push(eventTemplate(rebaseData));
  }

  return mergeOptions;
}
