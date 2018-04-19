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

import {PullRequestsQuery} from '../../types/gql-types';
import {github} from '../../utils/github';
import {getOrgRepos, getReviewsForPullRequest, PullRequest, Review} from '../common';

import {MetricResult} from './metric-result';

export class ReviewLatencyResult implements MetricResult {
  reviews: Review[];
  totalLatency: number;
  averageLatency: number;

  constructor(totalLatency: number, reviews: Review[]) {
    this.reviews = reviews;
    this.totalLatency = totalLatency;
    this.averageLatency = this.totalLatency / this.reviews.length;
  }

  summary() {
    const avg = Math.round(this.averageLatency / 1000 / 60 / 60);
    return `There were ${this.reviews.length} reviews ` +
        `with an average latency of ${avg} hours.`;
  }


  /**
   * Logs raw data for review latency. Currently logs average review latency by
   * weeks starting on Sunday.
   */
  rawData() {
    // Sort results into date buckets.
    const buckets: Map<string, Review[]> = new Map();
    for (const entry of this.reviews) {
      const date = new Date(entry.createdAt);
      // Sort into weekly buckets.
      date.setDate(date.getDate() - date.getDay());
      const dateKey = date.toDateString();
      const bucket = buckets.get(dateKey);
      if (bucket !== undefined) {
        bucket.push(entry);
      } else {
        buckets.set(dateKey, [entry]);
      }
    }

    // Log by date bucket.
    const dateComparator = (left: string, right: string) =>
        new Date(left) < new Date(right) ? -1 : 1;
    const keys = Array.from(buckets.keys()).sort(dateComparator);
    return keys
        .map((date) => {
          const entries = buckets.get(date)!;
          let totalLatency = 0;
          entries.forEach((entry) => totalLatency += entry.latency);
          return `${date}\t${totalLatency / entries.length / 1000 / 60 / 60}`;
        })
        .join('\n');
  }
}

type ReviewLatencyOpts = {
  org: [string],
  repo?: string, since: Date,
};

/**
 * Computes the review latency for a given GitHub organisation.
 */
export async function getReviewLatency(opts: ReviewLatencyOpts):
    Promise<ReviewLatencyResult> {
  let repos: Array<{owner: string, name: string}>;
  if (opts.repo) {
    repos = [{owner: opts.org[0], name: opts.repo}];
  } else {
    repos = [];
    for (const org of opts.org) {
      repos = repos.concat(await getOrgRepos(org));
    }
  }

  const fetches: Array<Promise<PullRequest[]>> = [];
  const reviews: Review[] = [];

  for (const {owner, name} of repos) {
    fetches.push(fetchPullRequestsForId(owner, name));
  }
  for (const prs of fetches) {
    for (const pr of await prs) {
      for (const review of getReviewsForPullRequest(pr)) {
        if (new Date(review.createdAt) > opts.since) {
          reviews.push(review);
        }
      }
    }
  }

  let totalLatency = 0;

  for (const event of reviews) {
    totalLatency += event.latency;
  }

  return new ReviewLatencyResult(totalLatency, reviews);
}

const pullRequestsQuery = gql`
  query PullRequests($owner: String!, $name: String!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      pullRequests(first: 100, after: $cursor) {
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          author {
            login
          }
          createdAt
          url
          reviews(first: 20, states: [APPROVED, CHANGES_REQUESTED, COMMENTED]) {
            nodes {
              author {
                login
              }
              submittedAt
            }
          }
        }
      }
    }
  }
    `;

/**
 * Fetches all pull requests for the specified repository node.
 */
async function fetchPullRequestsForId(
    owner: string, name: string): Promise<PullRequest[]> {
  const prs: PullRequest[] = [];

  const results = github().cursorQuery<PullRequestsQuery>(
      {
        query: pullRequestsQuery,
        variables: {owner, name},
        context: {token: process.env.GITHUB_TOKEN}
      },
      (data) => data.repository && data.repository.pullRequests);

  for await (const data of results) {
    const repo = data.repository;
    if (!repo) {
      break;
    }
    for (const pr of repo.pullRequests.nodes || []) {
      if (pr) {
        prs.push(pr);
      }
    }
  }
  return prs;
}
