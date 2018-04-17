import gql from 'graphql-tag';

import {RepoIdQuery} from '../../../types/gql-types';
import {github} from '../../../utils/github';
import {secrets} from '../../../utils/secrets';
import {WebHookHandleResponse} from '../../apis/github-webhook';
import {githubAppModel} from '../../models/githubAppModel';

export interface InstallHook {
  action: 'created';
  installation: {
    id: number; repository_selection: 'all' | 'selected';
    permissions: {[name: string]: string;};
    events: string[];
    account: {
      login: string,
      avatar_url: string,
      type: 'User' | 'Organization',
    }
  };
  repositories: Array<{id: number, name: string, full_name: string}>;
}

export async function handleGithubAppInstall(hookBody: InstallHook):
    Promise<WebHookHandleResponse> {
  await githubAppModel.addInstallation({
    installationId: hookBody.installation.id,
    permissions: hookBody.installation.permissions,
    events: hookBody.installation.events,
    repository_selection: hookBody.installation.repository_selection,
    type: hookBody.installation.account.type,
    login: hookBody.installation.account.login,
    avatar_url: hookBody.installation.account.avatar_url,
  });

  for (const repo of hookBody.repositories) {
    const repoId = await github().query<RepoIdQuery>({
      query: repoIdQuery,
      variables: {
        owner: hookBody.installation.account.login,
        name: repo.name,
      },
      fetchPolicy: 'network-only',
      context: {
        // TODO: Replace this with a token derived from the GitHub App
        // itself. At the moment this is using a persona access token
        // to get around restriction of GitHub app not having access
        // to GQL.
        token: secrets().GITHUB_APP_TO_GQL_TOKEN,
      }
    });

    if (!repoId || !repoId.data || !repoId.data.repository) {
      throw new Error(`Unable to get ID for ${repo.full_name}`);
    }

    await githubAppModel.addRepo(hookBody.installation.account.login, {
      id: repoId.data.repository.id,
      restId: repo.id,
      name: repo.name,
      full_name: repo.full_name,
    });
  }

  return {
    handled: true,
    notifications: null,
    message: 'Install recorded on backend',
  };
}

const repoIdQuery = gql`query RepoId ($owner: String!, $name: String!) {
  repository(owner:$owner name:$name) {
    id
  }
}`;
