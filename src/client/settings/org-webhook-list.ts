import {html} from '../../../node_modules/lit-html/lit-html.js';
import {render} from '../../../node_modules/lit-html/lib/lit-extended.js';
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
  const checkboxClick = () => {
    console.log('Checkbox Click: ', org);
  };
  return html`
  <div class="settings-toggle-item">
    <input class="settings-toggle-item__toggle" type="checkbox" on-click="${() => checkboxClick()}"></input>
    <div class="settings-toggle-item__details">
      <h6>${org.name}</h6>
      <p>TODO: Add state message</p>
    </div>
  </div>`;
}

function requestPermissionTemplate() {
  const readOrgsClick = () => {
    window.location.href = `/oauth.html?scope=read:org&final-redirect=${window.location.href}`;
  };
  const requestPermissionTemplate = html`<p><button on-click="${() => readOrgsClick()}">Allow Project Health read-only access to your organizations</button></p>`;
  return requestPermissionTemplate;
}

async function updateUI() {
  try {
    const state = await getState();
    const orgTemplate = html`${state.orgs.map(hookTemplate)}`;
    render(orgTemplate, orgListContainer);
  } catch (err) {
    render(requestPermissionTemplate(), orgListContainer);
  }
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
