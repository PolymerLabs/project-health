import {GithubRepo} from '../../models/githubAppModel';
import {settings, SettingsModule} from '../github-app-settings';

class PriorityIssueSetting implements SettingsModule {
  config() {
    return {
      'issues.priorityIssues': {
        default: false,
        description: 'Adds P0 - P3 labels in all repo\'s',
        type: 'boolean',
      },
    };
  }
  // tslint:disable-next-line:no-any
  async run(setting: any, repos: GithubRepo[]) {
    console.log('Priority Issue.: ', setting, 'on: ', repos);
  }
}

settings.addSettingsModule(new PriorityIssueSetting());
