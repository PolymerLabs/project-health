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

import {GitHub} from '../gql';
import * as gqlTypes from '../gql-types';

const orgReposQuery = gql`
  query OrgRepos($login: String!, $cursor: String) {
    organization(login: $login) {
      repositories(first: 100, after: $cursor) {
        nodes {
          id
          nameWithOwner
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }
`;

const pullRequestsQuery = gql`
  query PullRequests($id: ID!, $cursor: String) {
    node(id: $id) {
      __typename
      ... on Repository {
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
  }
    `;

const store: any = {};  // tslint:disable-line:no-any TODO

// Stores data objects from GitHub's API. Repositories are keyed
// by their id and the pull requests object is accumulated.
// tslint:disable-next-line:no-any TODO
function storeRepo(id: string, data: any) {
  if (!store[id].pullRequests) {
    store[id].pullRequests = {nodes: data.pullRequests.nodes.slice()};
  } else {
    store[id].pullRequests.nodes.push(...data.pullRequests.nodes);
  }
}

type ReviewLatencyEvent = {
  reviewedAt: string,
  latency: number,
};

function getReviewsForPullRequest(pullRequest: {
  author: {login: string},
  createdAt: string,
  reviews: {nodes: Array<{author: {login: string}, submittedAt: string}>},
}): ReviewLatencyEvent[] {
  const reviewEvents = [];
  const authors: any = {};  // tslint:disable-line: no-any TODO

  for (const review of pullRequest.reviews.nodes) {
    // Exclude 'reviews' made by the author of the pull request
    // & only count a maximum of 1 review per reviewer.
    if (review.author.login !== pullRequest.author.login &&
        authors[review.author.login] !== true) {
      authors[review.author.login] = true;
      reviewEvents.push({
        latency: new Date(review.submittedAt).getTime() -
            new Date(pullRequest.createdAt).getTime(),
        reviewedAt: review.submittedAt,
      });
    }
  }

  return reviewEvents;
}

// Calculate review latency for the entire store.
function getReviews() {
  const reviewLatencies: ReviewLatencyEvent[] = [];
  for (const id of Object.keys(store)) {
    for (const pullRequest of store[id].pullRequests.nodes) {
      reviewLatencies.push(...getReviewsForPullRequest(pullRequest));
    }
  }

  return reviewLatencies;
}

/**
 * Fetches all pull requests for the specified repository node.
 */
async function fetchPullRequestsForId(github: GitHub, id: string) {
  let hasNextPage = true;
  let cursor: string|null = null;
  while (hasNextPage) {
    const variables: gqlTypes.PullRequestsQueryVariables = {id, cursor};
    const result = await github.query<gqlTypes.PullRequestsQuery>(
        {query: pullRequestsQuery, variables});
    if (!result.data.node || result.data.node.__typename !== 'Repository') {
      break;
    }
    storeRepo(id, result.data.node);
    const pageInfo = result.data.node.pullRequests.pageInfo;
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }
}

/**
 * Computes the review latency for a given GitHub organisation.
 */
export async function reviewLatency(
    github: GitHub, config: {org: string, raw: boolean}): Promise<number> {
  let hasNextPage = true;
  let cursor: string|null = null;

  // Fetches the list of repos in the specified org.
  while (hasNextPage) {
    const variables:
        gqlTypes.OrgReposQueryVariables = {login: config.org, cursor};
    const result = await github.query<gqlTypes.OrgReposQuery>(
        {query: orgReposQuery, variables});
    if (!result.data.organization) {
      break;
    }

    for (const repo of result.data.organization.repositories.nodes || []) {
      if (repo) {
        store[repo.id] = {};
      }
    }

    const pageInfo = result.data.organization.repositories.pageInfo;
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }

  if (!config.raw) {
    console.log(
        `Found ${Object.keys(store).length} repos for ${config.org} org.`);
  }

  // Fetches all requests for all the repos in the org.
  const fetches = [];
  for (const id of Object.keys(store)) {
    fetches.push(fetchPullRequestsForId(github, id));
  }

  await Promise.all(fetches);

  const reviews = getReviews();

  let totalLatency = 0;

  if (config.raw) {
    dumpRawData(reviews);
  } else {
    for (const event of reviews) {
      totalLatency += event.latency;
    }

    console.log(`There were ${
        reviews.length} reviews with an average latency of ${
        Math.round(totalLatency / 1000 / 60 / 60 / reviews.length)} hours.`);
  }

  return totalLatency;
}

/**
 * Logs raw data for review latency. Currently logs average review latency by
 * weeks starting on Sunday.
 */
function dumpRawData(result: ReviewLatencyEvent[]) {
  // Sort results into date buckets.
  const buckets: Map<string, ReviewLatencyEvent[]> = new Map();
  for (const entry of result) {
    const date = new Date(entry.reviewedAt);
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
  const keys = Array.from(buckets.keys())
                   .sort(
                       (left: string, right: string) =>
                           new Date(left) < new Date(right) ? -1 : 1);
  for (const date of keys) {
    const entries = buckets.get(date)!;
    let totalLatency = 0;
    entries.forEach((entry) => totalLatency += entry.latency);
    console.log(`${date}\t${totalLatency / entries.length / 1000 / 60 / 60}`);
  }
}
