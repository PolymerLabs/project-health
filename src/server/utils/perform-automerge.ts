import {github} from '../../utils/github';
import {StatusHook} from '../controllers/webhook-events/types';

import {PullRequestDetails} from './get-pr-from-commit';

export async function performAutomerge(
    githubToken: string,
    hookData: StatusHook,
    prDetails: PullRequestDetails,
    mergeType: 'squash'|'rebase'|'merge'): Promise<boolean> {
  // Ensure the PR is open
  if (prDetails.state !== 'OPEN') {
    console.log(`(${hookData.name}) PR is not open: '${prDetails.state}'`);
    return false;
  }

  // If all commits state is success (all status checks passed) or
  if (prDetails.commit.state !== 'SUCCESS' && prDetails.commit.state !== null) {
    console.log(`(${
        hookData
            .name}) Status of the PR's commit is not 'SUCCESS' or 'null': '${
        prDetails.commit.state}'`);
    return false;
  }

  await github().put(
      `repos/${prDetails.owner}/${prDetails.repo}/pulls/${
          prDetails.number}/merge`,
      githubToken,
      {
        commit_title: prDetails.title,
        commit_message: prDetails.body,
        sha: prDetails.commit.oid,
        merge_method: mergeType,
      },
  );

  return true;
}
