import {html, render} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {OrgWebHookState} from '../../../../types/api.js';

let orgListContainer: Element;

function hookTemplate(org: OrgWebHookState) {
  const checkboxClick = async (event: Event) => {
    const checkboxElement = (event.target as HTMLInputElement);
    checkboxElement.setAttribute('disabled', 'true');

    if (!org.viewerCanAdminister) {
      console.warn(`Viewer cannot administer ${org.name}.`);
      checkboxElement.checked = false;
      return;
    }

    let response;
    let action;
    if (checkboxElement.checked) {
      action = 'add';
    } else {
      action = 'remove';
    }

    response = await fetch(`/api/manage-webhook/${action}`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        org: org.login,
      }),
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      // If the response is not a 2XX response, revert the checkbox state.
      // to reflect that the hook has not been enabled.
      checkboxElement.checked = !checkboxElement.checked;
    }

    updateUI();
  };

  let message = `You cannot enable updates for ${
      org.name}. Request an owner add the web hook.`;
  if (org.viewerCanAdminister) {
    if (org.hookEnabled) {
      message = `Updates enabled for members of ${
          org.name}. Toggle to disable updates for all members of ${org.name}.`;
    } else {
      message =
          `Updates not enabled. Toggle to enable updates for all members of ${
              org.name}.`;
    }
  }

  return html`
  <div class="settings-toggle-item">
    <div class="mdc-switch settings-toggle-item__toggle">
      <input class="mdc-switch__native-control" type="checkbox" disabled?="${
  !org.viewerCanAdminister}" checked="${org.hookEnabled}" on-click="${
      checkboxClick}"></input>
      <div class="mdc-switch__background">
        <div class="mdc-switch__knob"></div>
      </div>
    </div>
    <div class="settings-toggle-item__details">
      <div class="small-heading">${org.name}</div>
      <p>${message}</p>
    </div>
  </div>`;
}

function requestPermissionTemplate() {
  const readOrgsClick = () => {
    window.location.href =
        `/signin?scope=read:org admin:org_hook&final-redirect=${
            window.location.href}`;
  };
  const requestPermissionTemplate = html`<p><button on-click="${
      readOrgsClick}">Allow Project Health read-only access to your organizations</button></p>`;
  return requestPermissionTemplate;
}

async function updateUI() {
  const response = await fetch('/api/settings/orgs.json', {
    credentials: 'include',
    method: 'POST',
  });
  const data = await response.json();
  if (data.error) {
    if (data.error.id === 'missing_scopes') {
      render(requestPermissionTemplate(), orgListContainer);
    } else {
      console.error(
          'Unable to manage organization permissions: ' +
          `"${data.error.message}"`);
    }
  } else {
    const orgTemplate = html`${data.orgs.map(hookTemplate)}`;
    render(orgTemplate, orgListContainer);
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
