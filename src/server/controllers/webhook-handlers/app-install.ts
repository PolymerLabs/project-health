import gql from 'graphql-tag';

import * as webhooks from '../../../types/webhooks';
import {github} from '../../../utils/github';
import {githubAppModel, GithubRepo} from '../../models/githubAppModel';
import {generateGithubAppToken} from '../../utils/generate-github-app-token';
import {WebhookListener, WebhookListenerResponse, webhooksController} from '../github-app-webhooks';

export class AppInstaller implements WebhookListener {
  static ID = 'app-install-handler';

  async handleWebhookEvent(payload: webhooks.WebhookPayload):
      Promise<WebhookListenerResponse|null> {
    if (payload.type !== 'installation') {
      return null;
    }

    if (payload.action === 'created') {
      return await this.handleNewAppInstall(payload);
    } else if (payload.action === 'deleted') {
      return await this.handleDeleteApp(payload);
    } else {
      return null;
    }
  }

  async handleNewAppInstall(payload: webhooks.InstallationPayload) {
    const query = this.createRepoQuery(payload);
    if (!query) {
      return null;
    }

    // Generate a token from the installed app to use for this API request.
    const token = await generateGithubAppToken(payload.installation.id);
    const result = await github().query(
        {query: gql`${query}`, fetchPolicy: 'network-only', context: {token}});
    const data = result.data as {[key: string]: GithubRepo};
    const allRepos = Object.keys(data).map((repoKey) => {
      return data[repoKey];
    });

    await githubAppModel.addInstallation({
      installationId: payload.installation.id,
      permissions: payload.installation.permissions,
      events: payload.installation.events,
      repository_selection: payload.installation.repository_selection,
      type: payload.installation.account.type,
      login: payload.installation.account.login,
      avatar_url: payload.installation.account.avatar_url,
    });

    await githubAppModel.addRepos(payload.installation.account.login, allRepos);

    return {
      id: AppInstaller.ID,
      notifications: [],
    };
  }

  private createRepoQuery(payload: webhooks.InstallationPayload) {
    const owner = payload.installation.account.login;

    const queryId = 'repoId';
    const queries: string[] = [];
    const fragments: string[] = [
      `fragment repoFragment on Repository {
          id
          databaseId
          name
          nameWithOwner
        }`,
    ];

    if (!payload.repositories) {
      return null;
    }

    for (const repo of payload.repositories) {
      queries.push(`repository(owner:"${owner}" name:"${repo.name}") {
          ...repoFragment
        }`);
    }

    return `
      query ${queryId} {
        ${
        queries
            .map((queryString, index) => {
              return `${queryId}_${index}: ${queryString}`;
            })
            .join('\n')}
      }

      ${fragments.join('\n')}`;
  }

  async handleDeleteApp(payload: webhooks.InstallationPayload) {
    const installLogin = payload.installation.account.login;
    await githubAppModel.deleteInstallation(installLogin);
    return {
      id: AppInstaller.ID,
      notifications: [],
    };
  }
}

webhooksController.addListener('installation', new AppInstaller());
