import {html, render} from '../../../node_modules/lit-html/lit-html.js';

let orgListContainer: Element;

type OrgWebHookState = {
  name: string;
  viewerCanAdminister: boolean;
  hookIsEnabled: boolean;
};

type AllOrgsState = {
  orgs: OrgWebHookState[];
};

async function getState() {
  const state: AllOrgsState = {
    orgs: [],
  };

  // TODO: Get All Orgs
  const response = await fetch('/api/settings/orgs.json', {
    credentials: 'include',
    method: 'POST',
  });
  const data = await response.json();
  state.orgs = data.orgs;
  return state;
}

function hookTemplate(org: OrgWebHookState) {
  // TODO: Lit is doing something unexpected here.
  // https://github.com/Polymer/lit-html/issues/257
  // const disabledString = org.viewerCanAdminister ? '' : ' disabled';
  return html`
  <div class="settings-toggle-item">
    <input class="settings-toggle-item__toggle" type="checkbox"></input>
    <div class="settings-toggle-item__details">
      <h6>${org.name}</h6>
      <p>TODO: Add state message</p>
    </div>
  </div>`;
}

async function updateUI() {
  const state = await getState();
  const orgTemplate = html`${state.orgs.map(hookTemplate)}`;
  render(orgTemplate, orgListContainer);
}

function start() {
  const listElement = document.querySelector('.org-webhook-list');

  if (!listElement) {
    throw new Error('Unable to find toggle element.');
  }

  orgListContainer = listElement;

  updateUI();
}

start();
