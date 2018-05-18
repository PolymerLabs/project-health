import gql from 'graphql-tag';

import {github} from '../../../utils/github';
import {WebHookHandleResponse} from '../../apis/github-webhook';
import {githubAppModel, GithubRepo} from '../../models/githubAppModel';
import {generateGithubAppToken} from '../../utils/generate-github-app-token';

export interface InstallHook {
  action: 'created'|'deleted';
  installation: {
    id: number; repository_selection: 'all' | 'selected'; permissions: {
      [name: string]: string,
    };
    events: string[];
    account: {
      login: string,
      avatar_url: string,
      type: 'User'|'Organization',
    }
  };
  repositories?: Array<{
    id: number,
    name: string,
    full_name: string,
  }>;
}

async function handleNewAppInstall(hookBody: InstallHook) {
  const owner = hookBody.installation.account.login;

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

  if (!hookBody.repositories) {
    return {
      handled: false,
      notifications: null,
      message: 'No repositories defined.',
    };
  }

  for (const repo of hookBody.repositories) {
    queries.push(`repository(owner:"${owner}" name:"${repo.name}") {
      ...repoFragment
    }`);
  }

  const completeQuery = `
  query ${queryId} {
    ${
      queries
          .map((queryString, index) => {
            return `${queryId}_${index}: ${queryString}`;
          })
          .join('\n')}
  }

  ${fragments.join('\n')}`;

  // Generate a token from the installed app to use for this API request.
  const token = await generateGithubAppToken(hookBody.installation.id);
  const result = await github().query({
    query: gql`${completeQuery}`,
    fetchPolicy: 'network-only',
    context: {token}
  });
  const data = result.data as {[key: string]: GithubRepo};
  const allRepos = Object.keys(data).map((repoKey) => {
    return data[repoKey];
  });

  await githubAppModel.addInstallation({
    installationId: hookBody.installation.id,
    permissions: hookBody.installation.permissions,
    events: hookBody.installation.events,
    repository_selection: hookBody.installation.repository_selection,
    type: hookBody.installation.account.type,
    login: hookBody.installation.account.login,
    avatar_url: hookBody.installation.account.avatar_url,
  });

  await githubAppModel.addRepos(hookBody.installation.account.login, allRepos);

  return {
    handled: true,
    notifications: null,
    message: 'Install recorded on backend',
  };
}

async function handleDeleteApp(hookBody: InstallHook) {
  const installLogin = hookBody.installation.account.login;
  await githubAppModel.deleteInstallation(installLogin);
  return {
    handled: true,
    notifications: null,
    message: 'Deletion recorded on backend',
  };
}

export async function handleGithubAppInstall(hookBody: InstallHook):
    Promise<WebHookHandleResponse> {
  if (hookBody.action === 'created') {
    return handleNewAppInstall(hookBody);
  } else if (hookBody.action === 'deleted') {
    return handleDeleteApp(hookBody);
  }

  return {
    handled: false,
    notifications: null,
    message: `Unexpected installation action: ${hookBody.action}`,
  };
}
