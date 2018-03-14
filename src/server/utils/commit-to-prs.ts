import gql from 'graphql-tag';

import {CommitToPRQuery} from '../../types/gql-types';
import {github} from '../../utils/github';

// Used to clean the data from Apollo / GitHub API
export interface CommitToPR {
  id: string;
  number: number;
  title: string;
  body: string;
  url: string;
  owner: string;
  repo: string;
  author: string;
  commit: CommitDetails;
}

interface CommitDetails {
  oid: string;
  state: 'ERROR'|'EXPECTED'|'FAILURE'|'PENDING'|'SUCCESS'|null;
}

export async function commitToPRs(
    githubToken: string, repoOwner: string, sha: string):
    Promise<CommitToPR[]> {
  const statusPR = await github().query<CommitToPRQuery>({
    query: commitToPR,
    variables: {
      query: `type:pr repo:${repoOwner} ${sha}`,
    },
    fetchPolicy: 'network-only',
    // We use the commit author's token for this request
    context: {token: githubToken}
  });

  if (!statusPR.data.pullRequests || !statusPR.data.pullRequests.nodes) {
    return [];
  }

  const prs = [];
  for (const prData of statusPR.data.pullRequests.nodes) {
    if (!prData || prData.__typename !== 'PullRequest') {
      continue;
    }

    // We'll want to message the author
    if (!prData.author) {
      continue;
    }

    // Ensure the PR is open
    if (prData.state !== 'OPEN') {
      continue;
    }

    // If we can't confirm that the PR commit === the status commit - return;
    if (!prData.commits.nodes || prData.commits.nodes.length === 0) {
      continue;
    }

    const commits: CommitDetails[] = [];
    for (const commit of prData.commits.nodes) {
      // Check the commit exists
      if (!commit) {
        continue;
      }

      commits.push({
        oid: commit.commit.oid,
        state: commit.commit.status ? commit.commit.status.state : null,
      });
    }

    if (!commits.length) {
      continue;
    }

    const prDetails: CommitToPR = {
      id: prData.id,
      number: prData.number,
      title: prData.title,
      body: prData.bodyText,
      owner: prData.repository.owner.login,
      repo: prData.repository.name,
      url: prData.url,
      author: prData.author.login,
      commit: commits[0],
    };
    prs.push(prDetails);
  }

  return prs;
}

const commitToPR = gql`
query CommitToPR($query: String!) {
  pullRequests: search (
    first: 10,
    type: ISSUE,
    query: $query
  ) {
    nodes {
      ... on PullRequest {
        id,
        number,
        title,
        bodyText,
        state,
        url,
        repository {
          name
          owner {
            login
          }
        },
        author {
          login
        },
        commits(last: 1) {
          nodes {
            commit {
              oid,
              status {
                state
              }
            }
          }
        }
      }
    }
  }
}
`;
