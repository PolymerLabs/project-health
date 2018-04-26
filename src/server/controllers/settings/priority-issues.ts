import {GithubRepo} from '../../models/githubAppModel';
import {AppPlugin, settings} from '../github-app-settings';

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

  async settingsChanged<PluginSetting>(
      setting: PluginSetting,
      repos: GithubRepo[]) {
    console.log('Priority Issue.: ', setting, 'on: ', repos);
  }
}

settings.registerPlugin(new PriorityIssueSetting());
