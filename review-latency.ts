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
    query Name($owner: String!, $cursor: String){
      viewer {
        login
      }
      repository(owner: $owner, name: "Polymer") {
        pullRequests(first: 10, after: $cursor) {
          pageInfo {
            endCursor
            hasNextPage
          }
          nodes {
            url
            timeline(first: 100) {
              nodes {
                __typename
                ... on ReviewRequestedEvent {
                  actor {
                    avatarUrl
                    login
                    resourcePath
                    url
                  }
                  createdAt
                  subject {
                    id
                    login
                  }
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
  return new Promise((resolve) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });

    req.write(JSON.stringify({query, variables}));
    req.end();
  });
}

function pullRequests(cursor: string|undefined): Promise<any> {
  return apiCall(pullRequestsQuery, {owner: 'Polymer', cursor});
}

async function dumpData() {
  let hasNextPage = true;
  let cursor: string|undefined;
  while (hasNextPage) {
    const page = await pullRequests(cursor);
    console.log(page);
    const pageInfo = page.data.repository.pullRequests.pageInfo;
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.cursor;
  }
}

dumpData();