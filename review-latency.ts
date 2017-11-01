import * as https from 'https';

const options = {
  hostname: 'api.github.com',
  path: '/graphql',
  method: 'POST',
  headers: {
    'Authorization': 'bearer ' + process.env.GITHUB_TOKEN,
    'User-Agent': 'Project Health'
  },
};

const orgReposQuery = `
  query fetchOrgRepos($login: String!, $cursor: String) {
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

const pullRequestsQuery = `
  query pullRequestLatency($id: ID!, $cursor: String) {
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

function apiCall(
    query: string, variables: {[key: string]: string|undefined}): Promise<any> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // console.log(`GitHub API took ${Date.now() - start}ms to respond`);
        const parsedData = JSON.parse(data);
        if (parsedData.errors) {
          reject(data);
        } else if (parsedData.message) {
          // console.log(parsedData.message);
          reject(data);
        } else {
          resolve(parsedData);
        }
      });
    });

    req.write(JSON.stringify({query, variables}));
    req.end();
  });
}

function pullRequests(id: string, cursor: string|undefined): Promise<any> {
  return apiCall(pullRequestsQuery, {id, cursor});
}

function fetchOrgRepos(login: string, cursor: string|undefined): Promise<any> {
  return apiCall(orgReposQuery, {login, cursor});
}

let store: any = {};
// Stores data objects from GitHub's API. Repositories are keyed
// by their id and the pull requests object is accumulated.
function storeRepo(id: string, data: any) {
  if (!store[id].pullRequests) {
    store[id].pullRequests = data.pullRequests;
  } else {
    store[id].pullRequests.nodes.push(...data.pullRequests.nodes);
  }
}

type ReviewLatencyEvent = {
  reviewedAt: string,
  latency: number
};

function calculateReviewLatencyForPullRequest(pullRequest: {
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
function calculateReviewLatency() {
  const reviewLatencies: Array<ReviewLatencyEvent> = [];
  for (const id of Object.keys(store)) {
    for (const pullRequest of store[id].pullRequests.nodes) {
      reviewLatencies.push(
          ...calculateReviewLatencyForPullRequest(pullRequest));
    }
  }

  let totalLatency = 0;
  for (const event of reviewLatencies) {
    totalLatency += event.latency;
  }

  // console.log(`There were ${
  //     reviewLatencies.length} reviews with an average latency of ${
  //     Math.round(
  //         totalLatency / 1000 / 60 / 60 / reviewLatencies.length)} hours.`);
  return reviewLatencies;
}

async function fetchPullRequestsForId(id: string) {
  let hasNextPage = true;
  let cursor: string|undefined;
  while (hasNextPage) {
    const page = await pullRequests(id, cursor);
    storeRepo(id, page.data.node);
    const pageInfo = page.data.node.pullRequests.pageInfo;
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }
}

async function runOnOrg() {
  let hasNextPage = true;
  let cursor: string|undefined;
  while (hasNextPage) {
    const page = await fetchOrgRepos('GoogleChrome', cursor);
    for (const repo of page.data.organization.repositories.nodes) {
      store[repo.id] = repo;
    }
    const pageInfo = page.data.organization.repositories.pageInfo;
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }
  // console.log(`Found ${Object.keys(store).length} repos for GoogleChrome
  // org.`);

  const fetches = [];
  for (const id of Object.keys(store)) {
    fetches.push(fetchPullRequestsForId(id));
  }
  Promise.all(fetches).then(() => {
    const result = calculateReviewLatency();

    // Sort results into date buckets.
    const buckets: Map<string, [ReviewLatencyEvent]> = new Map();
    for (const entry of result) {
      const date = new Date(entry.reviewedAt);
      // Sort into weekly buckets.
      date.setDate(date.getDate() - date.getDay())
      const dateKey = date.toDateString();
      if (buckets.has(dateKey)) {
        buckets.get(dateKey).push(entry);
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
      let entries = buckets.get(date);
      let totalLatency = 0;
      entries.forEach((entry) => {totalLatency += entry.latency});
      console.log(`${date}\t${totalLatency / entries.length / 1000 / 60 / 60}`);
    }
  });
}

runOnOrg();