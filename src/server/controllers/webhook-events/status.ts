import gql from 'graphql-tag';

import {StatusToPRQuery} from '../../../types/gql-types';
import {github} from '../../../utils/github';
import {WebHookHandleResponse} from '../../apis/github-webhook';
import {sendNotification} from '../../controllers/notifications';
import {pullRequestsModel} from '../../models/pullRequestsModel';
import {userModel} from '../../models/userModel';
import {StatusHook} from './types';

// Triggered when the status of a Git commit changes.
export async function handleStatus(hookData: StatusHook):
    Promise<WebHookHandleResponse> {
  if (hookData.state !== 'error' && hookData.state !== 'failure') {
    return {handled: false, notifications: null};
  }

  // There was an error that should be reported to the PR Owner
  const author = hookData.commit.author;
  const loginDetails = await userModel.getLoginDetails(author.login);
  if (!loginDetails) {
    // Commit author isn't logged in so not token to figure out
    // appropriate PR's affect by this commit status
    return {handled: false, notifications: null};
  }

  const repo = hookData.repository;
  const statusPR = await github().query<StatusToPRQuery>({
    query: statusToPR,
    variables: {
      query: `type:pr repo:${hookData.name} ${hookData.sha}`,
    },
    fetchPolicy: 'network-only',
    // We use the commit author's token for this request
    context: {token: loginDetails.githubToken}
  });

  if (!statusPR.data.pullRequests || !statusPR.data.pullRequests.nodes) {
    return {handled: false, notifications: null};
  }

  const webhookResponse:
      WebHookHandleResponse = {handled: false, notifications: null};
  for (const prData of statusPR.data.pullRequests.nodes) {
    if (!prData || prData.__typename !== 'PullRequest') {
      continue;
    }

    // We'll want to message the author
    if (!prData.author) {
      continue;
    }

    // If we can't confirm that the PR commit === the status commit - return;
    if (!prData.commits.nodes || prData.commits.nodes.length === 0) {
      continue;
    }

    // Ensure the commit exists
    const commitNode = prData.commits.nodes[0];
    if (!commitNode) {
      continue;
    }


    const commit = commitNode.commit;
    if (commit.oid === hookData.sha) {
      const commitDetails =
          await pullRequestsModel.getCommitDetails(prData.id, commit.oid);

      if (!commitDetails || commitDetails.status !== hookData.state) {
        webhookResponse.handled = true;

        await pullRequestsModel.setCommitStatus(
            prData.id, commit.oid, hookData.state);

        const results = await sendNotification(prData.author.login, {
          title: hookData.description,
          body: `[${repo.name}] ${prData.title}`,
          requireInteraction: false,
          icon: '/images/notification-images/icon-192x192.png',
          data: {
            url: prData.url,
          }
        });
        webhookResponse.notifications = results;
      }
    }
  }

  return webhookResponse;
}

const statusToPR = gql`
query StatusToPR($query: String!) {
  pullRequests: search (
    first: 10,
    type: ISSUE,
    query: $query
  ) {
    nodes {
      ... on PullRequest {
        id,
        title,
        url,
        author {
          login
        },
        commits(last: 1) {
          nodes {
            commit {
              oid,
            }
          }
        }
      }
    }
  }
}
`;
