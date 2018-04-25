import * as fse from 'fs-extra';
import {validate} from 'jsonschema';
import * as path from 'path';

import {githubAppModel, GithubRepo} from '../models/githubAppModel';

// TODO: How should this be configured
type AvailableIssueTypes = boolean;

interface SettingsModuleConfig {
  default: AvailableIssueTypes;
  description: string;
  type: string;
}

export interface SettingsModule {
  config(): {[key: string]: SettingsModuleConfig};

  // tslint:disable-next-line:no-any
  run: (settingConfig: any, repos: GithubRepo[]) => Promise<void>;
}

class Settings {
  private moduleKeys: Set<string>;
  private settingsModules: SettingsModule[];
  private initialised: boolean;

  constructor() {
    this.initialised = false;
    this.settingsModules = [];
    this.moduleKeys = new Set();
  }

  addSettingsModule(module: SettingsModule) {
    const configKeys = Object.keys(module.config());
    for (const key of configKeys) {
      if (this.moduleKeys.has(key)) {
        throw new Error('Duplicate SettingsModule keys found: ' + key);
      }

      this.moduleKeys.add(key);
    }

    this.settingsModules.push(module);
  }

  private async init() {
    const settingsDir = path.join(__dirname, 'settings');
    // Autoloads priority issues
    const files = await fse.readdir(settingsDir);
    for (const file of files) {
      if (path.extname(file) === '.js') {
import(path.join(settingsDir, file));
      }
    }

    this.initialised = true;
  }

  // tslint:disable-next-line:no-any
  async validate(settings: any) {
    if (!this.initialised) {
      await this.init();
    }

    for (const module of this.settingsModules) {
      const config = module.config();
      for (const key of Object.keys(config)) {
        if (key in settings) {
          // tslint:disable-next-line:no-any
          const report = validate(settings[key] as any, config[key]);
          if (!report.valid) {
            // This ensures the problem key is included in the error message.
            throw new Error(`"${key}" ${report.errors[0]}.`);
          }
        }
      }
    }
  }

  async configChanged(
      orgOrUser: string,
      userSettings: {[key: string]: AvailableIssueTypes}) {
    if (!this.initialised) {
      await this.init();
    }

    const repos = await githubAppModel.getRepos(orgOrUser);
    if (repos.length === 0) {
      // No  repos, so nothing to do.
      return;
    }

    for (const module of this.settingsModules) {
      const config = module.config();
      const reducedSettings: {[key: string]: AvailableIssueTypes} = {};
      for (const key of Object.keys(config)) {
        if (userSettings[key]) {
          reducedSettings[key] = userSettings[key];
        } else {
          reducedSettings[key] = config[key].default;
        }
      }
      await module.run(reducedSettings, repos);
    }
  }
}


export const settings = new Settings();
