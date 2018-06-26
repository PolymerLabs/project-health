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
    if (payload.type !== 'installation' &&
        payload.type !== 'installation_repositories') {
      return null;
    }

    if (payload.action === 'created') {
      return await this.handleNewAppInstall(payload);
    } else if (payload.action === 'deleted') {
      return await this.handleDeleteApp(payload);
    } else if (payload.action === 'added' || payload.action === 'removed') {
      return await this.handleUpdatedAppInstall(payload);
    } else {
      return null;
    }
  }

  async handleNewAppInstall(payload: webhooks.InstallationPayload) {
    if (!payload.repositories) {
      return null;
    }
    const owner = payload.installation.account.login;
    const repos = payload.repositories.map((r) => r.name);
    const query = this.createRepoQuery(owner, repos);
    if (!query) {
      return null;
    }

    return this.updateInstall(payload, query, []);
  }

  async handleUpdatedAppInstall(payload:
                                    webhooks.InstallationRepositoriesPayload) {
    const owner = payload.installation.account.login;
    const reposToAdd = payload.repositories_added.map((r) => r.name);
    const queryToAdd = this.createRepoQuery(owner, reposToAdd);
    const reposToRemove = payload.repositories_removed.map((r) => r.name);
    return this.updateInstall(payload, queryToAdd, reposToRemove);
  }

  async updateInstall(
      payload: webhooks.InstallationPayload|
      webhooks.InstallationRepositoriesPayload,
      queryToAdd: string|null,
      reposToRemove: string[]) {
    await githubAppModel.addInstallation({
      installationId: payload.installation.id,
      permissions: payload.installation.permissions,
      events: payload.installation.events,
      repository_selection: payload.installation.repository_selection,
      type: payload.installation.account.type,
      login: payload.installation.account.login,
      avatar_url: payload.installation.account.avatar_url,
    });

    const token = await generateGithubAppToken(payload.installation.id);

    if (queryToAdd) {
      // Generate a token from the installed app to use for this API request.
      const result = await github().query({
        query: gql`${queryToAdd}`,
        fetchPolicy: 'network-only',
        context: {token}
      });
      const data = result.data as {[key: string]: GithubRepo};
      const allRepos = Object.keys(data).map((repoKey) => {
        return data[repoKey];
      });
      await githubAppModel.addRepos(
          payload.installation.account.login, allRepos);
    }

    // Remove specified repos.
    await githubAppModel.removeRepos(
        payload.installation.account.login, reposToRemove);

    return {
      id: AppInstaller.ID,
      notifications: [],
    };
  }

  /**
   * From a list of repository names, creates a query to fetch the IDs
   * associated with the repository.
   */
  private createRepoQuery(owner: string, repos: string[]): string|null {
    if (!repos.length) {
      return null;
    }
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

    for (const repo of repos) {
      queries.push(`repository(owner:"${owner}" name:"${repo}") {
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
webhooksController.addListener('installation_repositories', new AppInstaller());
