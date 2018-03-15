import {github} from '../../utils/github';
import {pullRequestsModel} from '../models/pullRequestsModel';

import {PullRequestDetails} from './get-pr-from-commit';

export async function performAutomerge(
    githubToken: string, repoFullName: string, prDetails: PullRequestDetails) {
  const automergeOpts = await pullRequestsModel.getAutomergeOpts(prDetails.id);
  if (!automergeOpts) {
    return;
  }

  const mergeType = automergeOpts.mergeType;
  if (!mergeType || mergeType === 'manual') {
    return;
  }

  await github().put(
      `repos/${repoFullName}/pulls/${prDetails.number}/merge`,
      githubToken,
      {
        commit_title: prDetails.title,
        commit_message: prDetails.body,
        sha: prDetails.commit.oid,
        merge_method: automergeOpts.mergeType,
      },
  );
}
