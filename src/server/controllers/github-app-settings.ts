import * as fse from 'fs-extra';
import {validate as validateAgainstSchema} from 'jsonschema';
import * as path from 'path';

import {githubAppModel, GithubRepo} from '../models/githubAppModel';
import {generateGithubAppToken} from '../utils/generate-github-app-token';

// TODO: This might be better of as conditional types
type AvailableIssueTypes = boolean;

interface AppPluginConfig {
  default: AvailableIssueTypes;
  description: string;
  type: string;
}

export interface AppPlugin<T = {}> {
  config(): {[key: string]: AppPluginConfig};

  settingsChanged(settingConfig: T, token: string, repos: GithubRepo[]):
      Promise<void>;
}

class Settings {
  private moduleKeys: Set<string>;
  private settingsModules: AppPlugin[];

  constructor() {
    this.settingsModules = [];
    this.moduleKeys = new Set();

    this.loadAppPlugins();
  }

  loadAppPlugins() {
    const settingsDir = path.join(__dirname, 'settings');

    const files = fse.readdirSync(settingsDir);
    for (const file of files) {
      if (path.extname(file) === '.js') {
import(path.join(settingsDir, file));
      }
    }
  }

  registerPlugin(module: AppPlugin) {
    const config = module.config();
    const configKeys = Object.keys(config);
    for (const key of configKeys) {
      if (this.moduleKeys.has(key)) {
        throw new Error('Duplicate SettingsModule keys found: ' + key);
      }

      this.moduleKeys.add(key);

      // Ensure the default key is valid (This should never be an issue)
      validateAgainstSchema(config[key].default, config[key], {
        throwError: true,
      });
    }

    this.settingsModules.push(module);
  }

  validate(settings: {[key: string]: {}}) {
    for (const module of this.settingsModules) {
      const config = module.config();
      for (const key of Object.keys(config)) {
        if (key in settings) {
          const report = validateAgainstSchema(settings[key], config[key]);
          if (!report.valid) {
            // This ensures the problem key is included in the error message.
            throw new Error(`"${key}" ${report.errors[0]}.`);
          }
        }
      }
    }
  }

  async onChange(
      orgOrUser: string,
      userSettings: {[key: string]: AvailableIssueTypes}) {
    const installDetails =
        await githubAppModel.getInstallationByOrgOrUserName(orgOrUser);
    if (!installDetails) {
      console.warn('Unable to find installation details for ' + orgOrUser);
      return;
    }

    const repos = await githubAppModel.getRepos(orgOrUser);
    if (repos.length === 0) {
      // No repos, so nothing to do.
      return;
    }

    for (const plugin of this.settingsModules) {
      const config = plugin.config();
      const reducedSettings: {[key: string]: AvailableIssueTypes} = {};
      for (const key of Object.keys(config)) {
        if (userSettings[key]) {
          reducedSettings[key] = userSettings[key];
        } else {
          reducedSettings[key] = config[key].default;
        }
      }

      const githubAppToken =
          await generateGithubAppToken(installDetails.installationId);
      await plugin.settingsChanged(reducedSettings, githubAppToken, repos);
    }
  }
}


export const settings = new Settings();
