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

import {OrgReposQuery, OrgReposQueryVariables} from '../types/gql-types';
import {GitHub} from '../utils/github';

/**
 * Fetch the repos under the given GitHub organization.
 */
export async function getOrgRepos(github: GitHub, orgName: string):
    Promise<Array<{owner: string, name: string}>> {
  const ids = [];

  const results = github.cursorQuery<OrgReposQuery, OrgReposQueryVariables>(
      orgReposQuery,
      {login: orgName},
      (data) => data.organization && data.organization.repositories);

  for await (const data of results) {
    if (!data.organization) {
      break;
    }
    for (const repo of data.organization.repositories.nodes || []) {
      if (repo) {
        ids.push({owner: repo.owner.login, name: repo.name});
      }
    }
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

/**
 * Given a pull request, returns the reviews made for that pull request. Reviews
 * must not be from the pull request author and must be from different
 * reviewers.
 */
export function getReviewsForPullRequest(pullRequest: PullRequest): Review[] {
  const reviewEvents = [];
  const authors = new Set<string>();

  if (!pullRequest.reviews || !pullRequest.reviews.nodes ||
      !pullRequest.author) {
    return [];
  }

  for (const review of pullRequest.reviews.nodes) {
    if (!review || !review.author || !review.submittedAt) {
      continue;
    }
    // Exclude 'reviews' made by the author of the pull request
    // & only count a maximum of 1 review per reviewer.
    if (review.author.login !== pullRequest.author.login &&
        !authors.has(review.author.login)) {
      authors.add(review.author.login);
      reviewEvents.push({
        latency: new Date(review.submittedAt).getTime() -
            new Date(pullRequest.createdAt).getTime(),
        reviewedAt: review.submittedAt,
      });
    }
  }

  return reviewEvents;
}

export type PullRequest = {
  author: {login: string}|null,
  createdAt: string,
  reviews: {
    nodes: Array<{
      author: {login: string} | null,
      submittedAt: string | null,
    }|null>|null,
  }|null,
};

export type Review = {
  reviewedAt: string,
  latency: number,
};
