import gql from 'graphql-tag';

import {CommitToPRQuery} from '../../types/gql-types';
import {github} from '../../utils/github';

// Used to clean the data from Apollo / GitHub API
export interface PullRequestDetails {
  id: string;
  number: number;
  title: string;
  body: string;
  url: string;
  owner: string;
  repo: string;
  author: string;
  commit: CommitDetails;
  state: 'OPEN'|'CLOSED'|'MERGED';
}

interface CommitDetails {
  oid: string;
  state: 'ERROR'|'EXPECTED'|'FAILURE'|'PENDING'|'SUCCESS'|null;
}

export async function getPRDetailsFromCommit(
    githubToken: string, repoFullName: string, sha: string):
    Promise<PullRequestDetails|null> {
  const statusPR = await github().query<CommitToPRQuery>({
    query: commitToPR,
    variables: {
      query: `type:pr repo:${repoFullName} ${sha}`,
    },
    // We use the commit author's token for this request
    context: {token: githubToken}
  });

  console.log('[get-pr-from-commit] statusPR: ' + JSON.stringify(statusPR));

  if (!statusPR.data.pullRequests || !statusPR.data.pullRequests.nodes) {
    console.log('[get-pr-from-commit] Get PR from commit');
    return null;
  }

  let pr: PullRequestDetails|null = null;
  for (const prData of statusPR.data.pullRequests.nodes) {
    if (!prData || prData.__typename !== 'PullRequest') {
      console.log('[get-pr-from-commit] not a pull request type');
      continue;
    }

    // We may want to send a notification to the author, so ensure it exists.
    if (!prData.author) {
      console.log('[get-pr-from-commit] no author');
      continue;
    }

    // If we can't confirm that the PR commit === the status commit - return;
    if (!prData.commits.nodes || prData.commits.nodes.length === 0) {
      console.log('[get-pr-from-commit] no commits');
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
      console.log('[get-pr-from-commit] no commits');
      continue;
    }

    // PR Query will only return 1
    // Should be safe based on:
    // https://stackoverflow.com/questions/9392365/how-would-git-handle-a-sha-1-collision-on-a-blob
    pr = {
      id: prData.id,
      number: prData.number,
      title: prData.title,
      body: prData.bodyText,
      owner: prData.repository.owner.login,
      repo: prData.repository.name,
      url: prData.url,
      author: prData.author.login,
      state: prData.state,
      commit: commits[0],
    };
  }

  console.log('[get-pr-from-commit] finalPR: ' + JSON.stringify(pr));

  return pr;
}

const commitToPR = gql`
query CommitToPR($query: String!) {
  pullRequests: search (first: 1, type: ISSUE, query: $query) {
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
