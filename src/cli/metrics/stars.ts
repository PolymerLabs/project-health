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

import {StarsQuery, StarsQueryVariables} from '../../types/gql-types';
import {github} from '../../utils/github';
import {getOrgRepos} from '../common';

import {MetricResult} from './metric-result';

export class StarsResult implements MetricResult {
  stars: Star[];

  constructor(stars: Star[]) {
    this.stars = stars;
  }

  summary() {
    return `There are ${this.stars.length} stars.`;
  }

  rawData() {
    // TODO: Implement a raw API
    return this.summary();
  }
}

type StarsOpts = {
  org: string,
  repo?: string,
};

type Star = {
  starredAt: string,
};

/**
 * Get all the stars for specified org/repo.
 */
export async function getStars(opts: StarsOpts): Promise<StarsResult> {
  let repos;
  if (opts.repo) {
    repos = [{owner: opts.org, name: opts.repo}];
  } else {
    repos = await getOrgRepos(opts.org);
  }

  const fetches = [];

  for (const {owner, name} of repos) {
    fetches.push(fetchStarsForRepo(owner, name));
  }

  const allStars = [];
  for (const fetch of fetches) {
    allStars.push(...await fetch);
  }

  return new StarsResult(allStars);
}

const starsQuery = gql`
  query Stars($owner: String!, $name: String!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      stargazers(first: 100, after: $cursor) {
        pageInfo {
          endCursor
          hasNextPage
        }
        edges {
          starredAt
        }
      }
    }
  }
    `;

/**
 * Fetches all starring events for a repo.
 */
async function fetchStarsForRepo(owner: string, name: string): Promise<Star[]> {
  const stars: Star[] = [];

  const results = github().cursorQuery<StarsQuery, StarsQueryVariables>(
      starsQuery,
      {owner, name},
      (data) => data.repository && data.repository.stargazers);

  for await (const data of results) {
    const repo = data.repository;
    if (!repo) {
      continue;
    }
    for (const star of repo.stargazers.edges || []) {
      if (star) {
        stars.push(star);
      }
    }
  }
  return stars;
}
