import {InMemoryCache} from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import {HttpLink} from 'apollo-link-http';
import gql from 'graphql-tag';
import fetch from 'node-fetch';
import * as gqlTypes from '../gql-types';

const github = new ApolloClient({
  link: new HttpLink({
    uri: 'https://api.github.com/graphql',
    headers: {
      'Authorization': 'bearer ' + process.env.GITHUB_TOKEN,
      'User-Agent': 'Project Health'
    },
    fetch: fetch,
  }),
  cache: new InMemoryCache(),
});

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

let store: any = {};
// Stores data objects from GitHub's API. Repositories are keyed
// by their id and the pull requests object is accumulated.
function storeRepo(id: string, data: any) {
  if (!store[id].pullRequests) {
    store[id].pullRequests = {nodes: data.pullRequests.nodes.slice()};
  } else {
    store[id].pullRequests.nodes.push(...data.pullRequests.nodes);
  }
}

type ReviewLatencyEvent = {
  reviewedAt: string,
  latency: number
};

function getReviewsForPullRequest(pullRequest: {
  author: {login: string},
  createdAt: string,
  reviews: {nodes: {author: {login: string}, submittedAt: string}[]}
}): ReviewLatencyEvent[] {
  const reviewEvents = [];
  const authors: any = {};

  for (const review of pullRequest.reviews.nodes) {
    // Exclude 'reviews' made by the author of the pull request
    // & only count a maximum of 1 review per reviewer.
    if (review.author.login != pullRequest.author.login &&
        authors[review.author.login] != true) {
      authors[review.author.login] = true;
      reviewEvents.push({
        reviewedAt: review.submittedAt,
        latency: new Date(review.submittedAt).getTime() -
            new Date(pullRequest.createdAt).getTime()
      });
    }
  }

  return reviewEvents;
}

// Calculate review latency for the entire store.
function getReviews() {
  const reviewLatencies: Array<ReviewLatencyEvent> = [];
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
async function fetchPullRequestsForId(id: string) {
  let hasNextPage = true;
  let cursor: string|null = null;
  while (hasNextPage) {
    const variables: gqlTypes.PullRequestsQueryVariables = {id, cursor};
    const result = await github.query<gqlTypes.PullRequestsQuery>(
        {query: pullRequestsQuery, variables});
    if (!result.data.node || result.data.node.__typename !== 'Repository')
      break;
    storeRepo(id, result.data.node);
    const pageInfo = result.data.node.pullRequests.pageInfo;
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }
}

/**
 * Computes the review latency for a given GitHub organisation.
 */
export default async function reviewLatency(config: any) {
  let hasNextPage = true;
  let cursor: string|null = null;

  // Fetches the list of repos in the specified org.
  while (hasNextPage) {
    const variables:
        gqlTypes.OrgReposQueryVariables = {login: config.org, cursor};
    const result = await github.query<gqlTypes.OrgReposQuery>(
        {query: orgReposQuery, variables});
    if (!result.data.organization)
      break;

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
    fetches.push(fetchPullRequestsForId(id));
  }

  Promise.all(fetches).then(() => {
    const reviews = getReviews();

    if (config.raw) {
      dumpRawData(reviews);
    } else {
      let totalLatency = 0;
      for (const event of reviews) {
        totalLatency += event.latency;
      }

      console.log(`There were ${
          reviews.length} reviews with an average latency of ${
          Math.round(totalLatency / 1000 / 60 / 60 / reviews.length)} hours.`);
    }
  });
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
    date.setDate(date.getDate() - date.getDay())
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
    let entries = buckets.get(date)!;
    let totalLatency = 0;
    entries.forEach((entry) => {totalLatency += entry.latency});
    console.log(`${date}\t${totalLatency / entries.length / 1000 / 60 / 60}`);
  }
}
