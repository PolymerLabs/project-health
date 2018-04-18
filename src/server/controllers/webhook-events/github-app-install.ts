import gql from 'graphql-tag';

import {github} from '../../../utils/github';
import {secrets} from '../../../utils/secrets';
import {WebHookHandleResponse} from '../../apis/github-webhook';
import {githubAppModel} from '../../models/githubAppModel';

export interface InstallHook {
  action: 'created';
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
  repositories: Array<{
    id: number,
    name: string,
    full_name: string,
  }>;
}

export async function handleGithubAppInstall(hookBody: InstallHook):
    Promise<WebHookHandleResponse> {
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

  for (const repo of hookBody.repositories) {
    queries.push(`repository(owner:"${owner}" name:"${repo.name}") {
      ...repoFragment
    }`);
  }

  const completeQuery = `query ${queryId} {
    ${
      queries
          .map((queryString, index) => {
            return `${queryId}_${index}: ${queryString}`;
          })
          .join('\n')}
  }

  ${fragments.join('\n')}`;

  const result = await github().query({
    query: gql`${completeQuery}`,
    fetchPolicy: 'network-only',
    context: {
      // TODO: Replace this with a token derived from the GitHub App
      // itself. At the moment this is using a persona access token
      // to get around restriction of GitHub app not having access
      // to GQL.
      token: secrets().GITHUB_APP_TO_GQL_TOKEN,
    }
  });
  const allRepos = Object.keys(result.data).map((repoKey) => {
    // tslint:disable-next-line:no-any
    return (result.data as any)[repoKey];
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
