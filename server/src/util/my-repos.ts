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
import * as request from 'request-promise-native';

import {GitHub} from '../gql';
import {MyReposQuery, MyReposQueryVariables} from '../gql-types';

const MAX_STATS_RETRIES = 5;

// Variables that impact the scoring algorithm.
const SCORE_THRESHOLD = 20;
const CONTRIBUTION_SIZE = 10;
const CONTRIBUTION_WINDOW = 1000 * 60 * 60 * 24 * 90;  // 90 days.

/**
 * Returns a list of repos that the given user contributes to. It is ordered
 * based on contribution recency and consistency.
 */
export async function getMyRepos(
    github: GitHub, login: string): Promise<string[]> {
  const repos = new Map<string, number>();
  const results = github.cursorQuery<MyReposQuery, MyReposQueryVariables>(
      reposQuery, {login}, (q) => q.user && q.user.contributedRepositories);
  const promises = [];
  for await (const data of results) {
    if (data.user) {
      for (const repo of data.user.contributedRepositories.nodes || []) {
        if (repo) {
          const promise = getContributionWeight(
              repo.owner.login,
              repo.name,
              login,
              process.env.GITHUB_TOKEN || '');
          promises.push(promise.then((score) => {
            repos.set(repo.owner.login + '/' + repo.name, score);
          }));
        }
      }
    }
  }
  await Promise.all(promises);
  const comparator = (a: string, b: string) => {
    return (repos.get(a) || 0) < (repos.get(b) || 0) ? 1 : -1;
  };
  let result = Array.from(repos.keys());
  // Filter out repos with small levels of contributions.
  result = result.filter((key) => (repos.get(key) || 0) > SCORE_THRESHOLD);
  return result.sort(comparator);
}

/**
 * Given a repo and a user, returns a weighted contribution score for the repo
 * (0-100).
 */
function getContributionWeight(
    org: string, repo: string, user: string, token: string): Promise<number> {
  return new Promise(async (resolve, reject) => {
    try {
      // GitHub doesn't provide a v4 API equivalent for stats, so v3 API must be
      // used.
      const query = {
        url: `https://api.github.com/repos/${org}/${repo}/stats/contributors`,
        headers: {
          'Accept': 'application/json',
          'Authorization': `token ${token}`,  // TODO
          'User-Agent': 'Project Health Bot',
        },
        resolveWithFullResponse: true,
        simple: false,
      };

      let response = await request.get(query);
      let retries = 0;
      // GitHub's API may serve a cached response and begin an asynchronous
      // job to calculate required data.
      while (response.statusCode !== 200 && retries++ < MAX_STATS_RETRIES) {
        await sleep(1000 * retries);
        response = await request.get(query);
      }

      if (response.statusCode === 200) {
        const stats = JSON.parse(response.body) as GitHubStatsResponse;
        // Find contribution stats for the specified user.
        const stat = stats.filter((x) => x.author.login === user);
        if (stat.length === 0) {
          resolve(0);
          return;
        }

        let contributions = 0;
        for (const week of stat[0].weeks) {
          // Convert UNIX timestamp in seconds to Date object.
          const date = new Date(Number(week.w) * 1000);
          const timeSince = Math.max(
                                (new Date().getTime() - date.getTime()),
                                CONTRIBUTION_WINDOW) /
              CONTRIBUTION_WINDOW;
          // Produce a weight between 0-1 based on the weeks passed. Anything
          // less than CONTRIBUTION_WINDOW will be ~1.
          const timeWeight = Math.tanh(5 / timeSince);
          // Weight any contribution by recency. Delta sizes are ignored.
          if (week.a + week.d + week.c) {
            contributions += timeWeight;
          }
        }

        const score = 100 * Math.tanh(contributions / CONTRIBUTION_SIZE);
        resolve(Math.round(score * 100) / 100);
      } else {
        reject(`Unable to fetch contribution stats for ${repo}. Got ${
            response.statusCode} from GitHub.`);
      }
    } catch (err) {
      reject(err);
    }
  });
}

const reposQuery = gql`
  query MyRepos($login:String!, $cursor: String) {
    user(login: $login) {
      contributedRepositories(first: 100, after: $cursor) {
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          name
          owner {
            login
          }
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
  weeks: [{w: string, a: number, d: number, c: number}],
}];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
