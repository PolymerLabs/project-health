import {html} from '../../../../../node_modules/lit-html/lib/lit-extended.js';
import {TemplateResult} from '../../../../../node_modules/lit-html/lit-html.js';
import * as api from '../../../../types/api.js';
import {BaseElement, property} from '../components/base-element.js';

const DEFAULT_CONFIG = `{
  // Add custom configuration here
}`;

class GithubAppConfig extends BaseElement {
  private orgName: string|null;
  @property() private errorMsg: string|null;
  @property() private currentConfig: string|null;
  @property() private initialised: boolean;

  constructor() {
    super();
    this.orgName = null;
    this.errorMsg = null;
    this.currentConfig = null;
    this.initialised = false;
  }

  async connectedCallback() {
    this.getLatestConfig();
  }

  private async getLatestConfig() {
    const queryParams = new URLSearchParams(window.location.search);
    let orgName: string|null = queryParams.get('org_name');
    if (!orgName) {
      const installId = queryParams.get('installation_id');
      if (!installId) {
        this.errorMsg = 'No Install ID defined.';
        return;
      }
      orgName = await this.getOrgNameFromInstallId(installId);
    }

    if (!orgName) {
      this.errorMsg = 'No org ID could be found.';
      return;
    }

    this.orgName = orgName;

    this.currentConfig = await this.getConfig();
    this.initialised = true;
  }

  async getConfig(): Promise<string|null> {
    const response = await fetch('/api/github-app/get-config', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        orgName: this.orgName,
      }),
      credentials: 'include',
    });

    // tslint:disable-next-line:no-any
    const responseBody =
        await response.json() as api.JSONAPIResponse<api.OrgSettings>;
    if ('error' in responseBody) {
      this.errorMsg = responseBody.error.message;
      return null;
    }

    if (!('data' in responseBody)) {
      this.errorMsg = 'No data provided for installation ID.';
      return null;
    }

    return responseBody.data.fileContents;
  }

  async getOrgNameFromInstallId(installId: string): Promise<string|null> {
    const response = await fetch('/api/github-app/details', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        installId: Number(installId),
      }),
      credentials: 'include',
    });

    const responseBody =
        await response.json() as api.JSONAPIResponse<api.GithubAppInstall>;
    if ('error' in responseBody) {
      this.errorMsg = responseBody.error.message;
      return null;
    }

    if (!('data' in responseBody)) {
      this.errorMsg = 'No data provided for installation ID.';
      return null;
    }

    const installData = responseBody.data;
    return installData.login;
  }

  render(): TemplateResult {
    if (this.errorMsg) {
      return html`<h2>GitHub App Configuration</h2>

      <p>${this.errorMsg}</p>`;
    }

    if (!this.initialised) {
      return html`<h2>GitHub App Configuration</h2>

      <p>Loading....</p>`;
    }

    let configDisplay = DEFAULT_CONFIG;
    if (this.currentConfig) {
      configDisplay = this.currentConfig;
    }

    return html`
<h2>GitHub App Configuration</h2>
<div class="editor-container">
<textarea class="github-app-defaults text-editor">
{
  // Priority issues. Enable this to add support
  // for priority labels.
  "issues.priorityIssues": false,
}
</textarea>
<textarea id="settings-text-area" class="text-editor">
${configDisplay}
</textarea>
</div>
<div class="button-container">
  <button id="reset-btn" on-click="${() => this.resetConfig()}">Reset</button>
  <button id="save-btn" on-click="${() => this.saveConfig()}">Save</button>
</div>
`;
  }

  private async saveConfig() {
    const settingsTextArea = document.querySelector('#settings-text-area');
    const resetButton = document.querySelector('#reset-btn');
    const saveButton = document.querySelector('#save-btn');
    if (!settingsTextArea) {
      console.warn('Unable to find the \'#settings-text-area\' element.');
      return;
    }
    if (!resetButton) {
      console.warn('Unable to find the \'#reset-btn\' element.');
      return;
    }
    if (!saveButton) {
      console.warn('Unable to find the \'#save-btn\' element.');
      return;
    }

    settingsTextArea.setAttribute('disabled', 'true');
    resetButton.setAttribute('disabled', 'true');
    saveButton.setAttribute('disabled', 'true');

    const response = await fetch('/api/github-app/save-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orgName: this.orgName,
        settings: (settingsTextArea as HTMLTextAreaElement).value,
      }),
      credentials: 'include',
    });
    const responseBody =
        await response.json() as api.JSONAPIResponse<api.GenericStatusResponse>;

    if ('error' in responseBody) {
      // TODO: Find a nicer way to call out a bad settings file
      window.alert('Unable to save settings: ' + responseBody.error.message);
    }

    settingsTextArea.removeAttribute('disabled');
    resetButton.removeAttribute('disabled');
    saveButton.removeAttribute('disabled');
  }

  private resetConfig() {
    const settingsTextArea = document.querySelector('#settings-text-area');
    if (!settingsTextArea) {
      console.warn('Unable to find the \'#settings-text-area\' element.');
      return;
    }

    if (this.currentConfig) {
      (settingsTextArea as HTMLTextAreaElement).value = this.currentConfig;
    } else {
      (settingsTextArea as HTMLTextAreaElement).value = DEFAULT_CONFIG;
    }
  }
}

customElements.define('github-app-config', GithubAppConfig);
