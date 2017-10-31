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

const pullRequestsQuery = `
    query Name($owner: String!, $cursor: String) {
      repository(owner: $owner, name: "prpl-server-node") {
        id
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

function apiCall(
    query: string, variables: {[key: string]: string|undefined}): Promise<any> {
  const start = Date.now();
  return new Promise((resolve) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`GitHub API took ${Date.now() - start}ms to respond`);
        resolve(JSON.parse(data));
      });
    });

    req.write(JSON.stringify({query, variables}));
    req.end();
  });
}

function pullRequests(cursor: string|undefined): Promise<any> {
  return apiCall(pullRequestsQuery, {owner: 'Polymer', cursor});
}

let store: any = {};
// Stores data objects from GitHubs API.
function storeRepo(data: any) {
  if (!store[data.repository.id]) {
    store[data.repository.id] = data.repository;
  } else {
    const newPullRequests = data.repository.pullRequests.nodes;
    store[data.repository.id].pullRequests.nodes.concat(newPullRequests);
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

const reviewLatencies: Array<ReviewLatencyEvent> = [];

function calculateReviewLatency() {
  for (const id of Object.keys(store)) {
    for (const pullRequest of store[id].pullRequests.nodes) {
      const result = calculateReviewLatencyForPullRequest(pullRequest);
      console.log(`${pullRequest.url} has ${result.length} reviews.`);
      reviewLatencies.push(...result);
    }
  }

  let totalLatency = 0;
  for (const event of reviewLatencies) {
    totalLatency += event.latency;
  }

  console.log(`There were ${
      reviewLatencies.length} reviews with an average latency of ${
      Math.round(
          totalLatency / 1000 / 60 / 60 / reviewLatencies.length)} hours.`);
}

async function dumpData() {
  let hasNextPage = true;
  let cursor: string|undefined;
  while (hasNextPage) {
    const page = await pullRequests(cursor);
    storeRepo(page.data);
    const pageInfo = page.data.repository.pullRequests.pageInfo;
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.cursor;
  }
  calculateReviewLatency();
}

dumpData();