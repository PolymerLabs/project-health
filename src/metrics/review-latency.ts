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

export class ReviewLatencyResult {
  reviews: Review[];
  totalLatency: number;
  averageLatency: number;

  constructor(totalLatency: number, reviews: Review[]) {
    this.reviews = reviews;
    this.totalLatency = totalLatency;
    this.averageLatency = this.totalLatency / this.reviews.length;
  }

  format(): string {
    const avg = Math.round(this.averageLatency / 1000 / 60 / 60);
    return `There were ${this.reviews.length} reviews ` +
        `with an average latency of ${avg} hours.`;
  }
}

type ReviewLatencyOpts = {
  org: string,
  repo?: string,
};

/**
 * Computes the review latency for a given GitHub organisation.
 */
export async function getReviewLatency(
    github: GitHub, opts: ReviewLatencyOpts): Promise<ReviewLatencyResult> {

  let repos;
  if (opts.repo) {
    repos = [{owner:opts.org, name:opts.repo}];
  } else {
    repos = await getOrgRepos(github, opts.org);
  }

  const fetches = [];
  const reviews: Review[] = [];

  for (const {owner, name} of repos) {
    fetches.push(fetchPullRequestsForId(github, owner, name));
  }
  for (const prs of fetches) {
    for (const pr of await prs) {
      reviews.push(...getReviewsForPullRequest(pr));
    }
  }

  let totalLatency = 0;

  for (const event of reviews) {
    totalLatency += event.latency;
  }

  return new ReviewLatencyResult(totalLatency, reviews);
}

async function getOrgRepos(github: GitHub, orgName: string):
    Promise<Array<{owner: string, name: string}>> {
  let hasNextPage = true;
  let cursor: string|null = null;
  const ids = [];

  // Fetches the list of repos in the specified org.
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


type Review = {
  reviewedAt: string,
  latency: number,
};

/**
 * Given a pull request, returns the reviews made for that pull request. Reviews
 * must not be from the pull request author and must be from different
 * reviewers.
 */
function getReviewsForPullRequest(pullRequest: PullRequest): Review[] {
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

type PullRequest = {
  author: {login: string}|null,
  createdAt: string,
  reviews: {
    nodes: Array<{
      author: {login: string} | null,
      submittedAt: string | null,
    }|null>|null,
  }|null,
};

/**
 * Fetches all pull requests for the specified repository node.
 */
async function fetchPullRequestsForId(
    github: GitHub, owner: string, name: string): Promise<PullRequest[]> {
  let hasNextPage = true;
  let cursor: string|null = null;
  const prs: PullRequest[] = [];
  while (hasNextPage) {
    const variables:
        gqlTypes.PullRequestsQueryVariables = {owner, name, cursor};
    const result = await github.query<gqlTypes.PullRequestsQuery>(
        {query: pullRequestsQuery, variables});
    const repo = result.data.repository;
    if (!repo) {
      break;
    }
    for (const pr of repo.pullRequests.nodes || []) {
      if (pr) {
        prs.push(pr);
      }
    }
    const pageInfo = repo.pullRequests.pageInfo;
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }
  return prs;
}

/**
 * Logs raw data for review latency. Currently logs average review latency by
 * weeks starting on Sunday.
 */

/*
function dumpRawData(result: Review[]) {
 // Sort results into date buckets.
 const buckets: Map<string, Review[]> = new Map();
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
*/
