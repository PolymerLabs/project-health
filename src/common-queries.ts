/*
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import gql from 'graphql-tag';

import {GitHub} from './gql';
import * as gqlTypes from './gql-types';

/**
 * Fetch the repos under the given GitHub organization.
 */
export async function getOrgRepos(github: GitHub, orgName: string):
    Promise<Array<{owner: string, name: string}>> {
  let hasNextPage = true;
  let cursor: string|null = null;
  const ids = [];

  while (hasNextPage) {
    const variables: gqlTypes.OrgReposQueryVariables = {login: orgName, cursor};
    const result = await github.query<gqlTypes.OrgReposQuery>(
        {query: orgReposQuery, variables});
    if (!result.data.organization) {
      break;
    }

    for (const repo of result.data.organization.repositories.nodes || []) {
      if (repo) {
        ids.push({owner: repo.owner.login, name: repo.name});
      }
    }

    const pageInfo = result.data.organization.repositories.pageInfo;
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }

  return ids;
}

const orgReposQuery = gql`
  query OrgRepos($login: String!, $cursor: String) {
    organization(login: $login) {
      repositories(first: 100, after: $cursor) {
        nodes {
          owner {
            login
          }
          name
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }
`;
