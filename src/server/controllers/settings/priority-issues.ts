import {GithubRepo} from '../../models/githubAppModel';
import {AppPlugin, settings} from '../github-app-settings';

import {addLabels, deleteLabels} from './manage-github-labels';

// TODO: Conditional types might allow us to define this from config()
export interface PluginSetting {
  'issues.priorityIssues': boolean;
}

class PriorityIssuePlugin implements AppPlugin {
  config() {
    return {
      'issues.priorityIssues': {
        default: false,
        description: 'Adds P0 - P3 labels in all repo\'s',
        type: 'boolean',
      },
    };
  }

  async settingsChanged(
      settingConfig: PluginSetting,
      token: string,
      repos: GithubRepo[]) {
    const priorityLabels = [
      {name: 'P0', description: 'Critical', color: 'FF0000'},
      {name: 'P1', description: 'Need', color: 'FF6100'},
      {name: 'P2', description: 'Want', color: 'FFC500'},
      {name: 'P3', description: 'Not Critical', color: 'FEF2C0'},
    ];

    if (!settingConfig['issues.priorityIssues']) {
      for (const repo of repos) {
        deleteLabels(token, repo, priorityLabels);
      }
    } else {
      for (const repo of repos) {
        addLabels(token, repo, priorityLabels);
      }
    }
  }
}

settings.registerPlugin(new PriorityIssuePlugin());
