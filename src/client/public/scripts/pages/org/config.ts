import {html} from '../../../../../../node_modules/lit-html/lib/lit-extended.js';
import * as api from '../../../../../types/api.js';
import {BaseElement, property} from '../../components/base-element.js';
import {TemplateResult} from '.././../../../../../node_modules/lit-html/lit-html.js';

const DEFAULT_CONFIG = `{
  // Add custom configuration here
}`;

class OrgConfig extends BaseElement {
  @property() private orgName: string|null;
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
    const urlParams = this.getAttribute('urlparams');
    if (urlParams) {
      const splitParams = urlParams.split('/');
      this.orgName = splitParams[0];
    }
    this.getLatestConfig();
  }

  private async getLatestConfig() {
    if (!this.orgName) {
      this.errorMsg = 'No org name could be found.';
      return;
    }

    this.currentConfig = await this.getConfig();
    this.initialised = true;
  }

  async getConfig(): Promise<string|null> {
    const response = await fetch(`/api/org/config/${this.orgName}`, {
      method: 'GET',
      credentials: 'include',
    });

    const responseBody =
        await response.json() as api.JSONAPIResponse<api.OrgSettings>;
    if ('error' in responseBody) {
      this.errorMsg = responseBody.error.message;
      return null;
    }

    if (!('data' in responseBody)) {
      this.errorMsg = 'No data provided for org config.';
      return null;
    }

    if (responseBody.data === null) {
      return null;
    }

    return responseBody.data.fileContents;
  }

  render(): TemplateResult {
    const title = this.orgName ? this.orgName : 'Org';
    if (this.errorMsg) {
      return html`<h2>${title} settings</h2>

      <p>${this.errorMsg}</p>`;
    }

    if (!this.initialised) {
      return html`<h2>${title} settings</h2>

      <p>Loading....</p>`;
    }

    let configDisplay = DEFAULT_CONFIG;
    if (this.currentConfig) {
      configDisplay = this.currentConfig;
    }

    return html`<h2>${title} settings</h2>

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
    <button id="reset-btn" on-click="${
        this.resetConfig.bind(this)}">Reset</button>
    <button id="save-btn" on-click="${this.saveConfig.bind(this)}">Save</button>
  </div>`;
  }

  private async saveConfig() {
    const settingsTextArea = this.querySelector('#settings-text-area');
    const resetButton = this.querySelector('#reset-btn');
    const saveButton = this.querySelector('#save-btn');
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

    const newSettings = (settingsTextArea as HTMLTextAreaElement).value;
    const response = await fetch(`/api/org/config/${this.orgName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orgName: this.orgName,
        settings: newSettings,
      }),
      credentials: 'include',
    });
    const responseBody =
        await response.json() as api.JSONAPIResponse<api.GenericStatusResponse>;

    if ('error' in responseBody) {
      // TODO: Find a nicer way to call out a bad settings file
      window.alert('Unable to save settings: ' + responseBody.error.message);
    } else {
      this.currentConfig = newSettings;
    }

    settingsTextArea.removeAttribute('disabled');
    resetButton.removeAttribute('disabled');
    saveButton.removeAttribute('disabled');
  }

  private resetConfig() {
    const settingsTextArea = this.querySelector('#settings-text-area');
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

customElements.define('org-config', OrgConfig);
