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
      repository(owner: $owner, name: "web-component-tester") {
        id
        nameWithOwner
        pullRequests(first: 100, after: $cursor) {
          pageInfo {
            endCursor
            hasNextPage
          }
          nodes {
            url
            timeline(first: 50) {
              nodes {
                __typename
                ... on PullRequestReview {
                  author {
                    login
                  }
                  createdAt
                  state
                }
                ... on ReviewRequestedEvent {
                  subject {
                    login
                  }
                  createdAt
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

function calculateReviewLatencyForPullRequest(timeline: any):
    {totalEvents: number, totalLatency: number} {
  let numReviews = 0;
  let latency: number = 0;
  let reviewRequests: any = {};
  for (const event of timeline.nodes) {
    if (event.__typename == 'ReviewRequestedEvent') {
      reviewRequests[event.subject.login] = event.createdAt;
    } else if (event.__typename == 'PullRequestReview') {
      // Review may have never been requested.
      if (reviewRequests[event.author.login]) {
        numReviews++;
        latency += new Date(event.createdAt) -
            new Date(reviewRequests[event.author.login]);
        delete reviewRequests[event.author.login];
      }
    }
  }
  return {totalEvents: numReviews, totalLatency: latency};
}

// This doesn't factor in time buckets
let reviewLatency = {totalEvents: 0, totalLatency: 0};
function accumulateLatency(
    latency: {totalEvents: number, totalLatency: number}) {
  reviewLatency.totalEvents += latency.totalEvents;
  reviewLatency.totalLatency += latency.totalLatency;
}

function calculateReviewLatency() {
  for (const id of Object.keys(store)) {
    for (const pullRequest of store[id].pullRequests.nodes) {
      const result = calculateReviewLatencyForPullRequest(pullRequest.timeline);
      accumulateLatency(result);
      console.log(`${pullRequest.url} had ${
          result.totalEvents} reviews with a total latency of ${
          Math.round(result.totalLatency / 1000 / 60 / 60)} hours.`);
    }
  }

  console.log(`There were ${
      reviewLatency.totalEvents} reviews with an average latency of ${
      Math.round(
          reviewLatency.totalLatency / 1000 / 60 / 60 /
          reviewLatency.totalEvents)} hours.`);
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