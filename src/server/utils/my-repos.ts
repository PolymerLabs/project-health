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
import {promisify} from 'util';

import * as api from '../../types/api';
import {MyReposQuery, MyReposQueryVariables} from '../../types/gql-types';
import {github} from '../../utils/github';

const MAX_STATS_RETRIES = 5;

// Variables that impact the scoring algorithm.

// Repos below this score are discarded from the list.
const SCORE_THRESHOLD = 30;
// A contribution is roughly a commit. This parameter impacts the distribution &
// scale of the resulting scores.
const CONTRIBUTION_SIZE = 10;
const CONTRIBUTION_WINDOW = 1000 * 60 * 60 * 24 * 7;  // 7 days.

type RepoWithScore = api.Repository&{score: number};

/**
 * Returns a list of repos that the given user contributes to. It is ordered
 * based on contribution recency and consistency.
 */
export async function generateMyRepoList(
    login: string, token: string): Promise<api.Repository[]> {
  const repos = new Map<string, RepoWithScore>();
  const variables: MyReposQueryVariables = {login};

  const response = await github().query<MyReposQuery>({
    query: reposQuery,
    variables,
    context: {token},
    fetchPolicy: 'network-only'
  });

  const promises = [];
  if (!response.data.user) {
    return [];
  }
  for (const repo of response.data.user.repositoriesContributedTo.nodes || []) {
    // Ignore archived repos.
    if (!repo || repo.isArchived) {
      continue;
    }
    const promise =
        getContributionWeight(repo.owner.login, repo.name, login, token);
    promises.push(promise.then((score) => {
      repos.set(repo.owner.login + '/' + repo.name, {
        score,
        owner: repo.owner.login,
        name: repo.name,
        avatarUrl: repo.owner.avatarUrl,
      });
    }));
  }
  await Promise.all(promises);
  const comparator = (a: string, b: string) => {
    return repos.get(a)!.score < repos.get(b)!.score ? 1 : -1;
  };
  let result = Array.from(repos.keys());

  // Filter out repos with small levels of contributions.
  result = result.filter((key) => {
    const record = repos.get(key);
    if (!record) {
      return false;
    }
    return record.score > SCORE_THRESHOLD;
  });

  // Only keep the top 10 and sort descending by score.
  return result.sort(comparator).slice(0, 10).map((key) => {
    const record = repos.get(key)!;
    delete record.score;
    return record;
  });
}

/**
 * Given a repo and a user, returns a weighted contribution score for the repo
 * (0-100).
 */
async function getContributionWeight(
    org: string, repo: string, user: string, token: string): Promise<number> {
  try {
    // GitHub doesn't provide a v4 API equivalent for stats, so v3 API must be
    // used.
    const queryPath = `repos/${org}/${repo}/stats/contributors`;

    let response = await github().get(queryPath, token);
    let retries = 0;

    // GitHub's API may serve a cached response and begin an asynchronous
    // job to calculate required data.
    while (response.status !== 200 && retries++ < MAX_STATS_RETRIES) {
      await setTimeoutPromise(1000 * retries);
      response = await github().get(queryPath, token);
    }

    if (response.status === 200) {
      const stats = await response.json() as GitHubStatsResponse;
      // Find contribution stats for the specified user.
      const stat = stats.filter((x) => x.author.login === user);
      if (stat.length === 0) {
        return 0;
      }

      let contributions = 0;
      for (const week of stat[0].weeks) {
        // Convert UNIX timestamp in seconds to Date object.
        const date = new Date(Number(week.w) * 1000);
        // Multiple of CONTRIBUTION_WINDOW. Minimum is 1.
        const timeSince =
            Math.max(
                (new Date().getTime() - date.getTime()), CONTRIBUTION_WINDOW) /
            CONTRIBUTION_WINDOW;
        // Produce a weight between 0-1 based on the weeks passed. Anything
        // less than CONTRIBUTION_WINDOW will be ~1.
        const timeWeight = Math.tanh(5 / timeSince);
        // Weight any contribution by recency. Delta sizes are ignored.
        if (week.a || week.d || week.c) {
          contributions += timeWeight;
        }
      }

      const score = 100 * Math.tanh(contributions / CONTRIBUTION_SIZE);
      return Math.round(score * 100) / 100;
    } else {
      throw new Error(`Unable to fetch contribution stats for ${repo}. Got ${
          response.status} from GitHub.`);
    }
  } catch (err) {
    throw err;
  }
}

const reposQuery = gql`
  query MyRepos($login:String!) {
    user(login: $login) {
      repositoriesContributedTo(first: 100, orderBy: {field: UPDATED_AT, direction: DESC}, contributionTypes: COMMIT) {
        nodes {
          name
          owner {
            login
            avatarUrl
          }
          isArchived
        }
      }
    }
  }
`;

// Based on API response documented at
// https://developer.github.com/v3/repos/statistics/#get-contributors-list-with-additions-deletions-and-commit-counts
type GitHubStatsResponse = [{
  author: {login: string},
  total: number,
  // (w)eek unix timestamp, (a)dditions, (d)eletions, (c)ommits
  weeks: [{w: string, a: number, d: number, c: number}],
}];

const setTimeoutPromise = promisify(setTimeout);
