import {github} from '../../utils/github';
import {StatusHook} from '../controllers/webhook-events/types';
import {LoginDetails} from '../models/userModel';

import {getPRDetailsFromCommit} from './get-pr-from-commit';

export async function performAutomerge(
    loginDetails: LoginDetails,
    hookData: StatusHook,
    mergeType: 'squash'|'rebase'|'merge'): Promise<string> {
  // We must add a delay to ensure that GitHub's API returns the most
  // up-to-date value, otherwise the status may be marked as 'pending' even
  // though the hook we have received is 'success' and it's the only status.
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const prDetails = await getPRDetailsFromCommit(
      loginDetails.githubToken, hookData.name, hookData.sha);
  if (!prDetails) {
    return `${hookData.name}) Unable to find PR Details.`;
  }

  // Ensure the PR is open
  if (prDetails.state !== 'OPEN') {
    throw new Error(`(${hookData.name}) PR is not open: '${prDetails.state}'`);
  }

  // If all commits state is success (all status checks passed) or
  if (prDetails.commit.state !== 'SUCCESS' && prDetails.commit.state !== null) {
    return `(${
        hookData
            .name}) Status of the PR's commit is not 'SUCCESS' or 'null': '${
        prDetails.commit.state}'`;
  }

  await github().put(
      `repos/${prDetails.owner}/${prDetails.repo}/pulls/${
          prDetails.number}/merge`,
      loginDetails.githubToken,
      {
        commit_title: prDetails.title,
        commit_message: prDetails.body,
        sha: prDetails.commit.oid,
        merge_method: mergeType,
      },
  );

  return `(${hookData.name}) Merge successful.`;
}
