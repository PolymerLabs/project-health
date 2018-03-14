import {github} from '../../utils/github';
import {pullRequestsModel} from '../models/pullRequestsModel';

import {CommitToPR} from './commit-to-prs';

export async function performAutomerge(
    githubToken: string, repoOwner: string, prDetails: CommitToPR) {
  const automergeOpts = await pullRequestsModel.getAutomergeOpts(prDetails.id);
  if (!automergeOpts) {
    return;
  }

  const mergeType = automergeOpts.mergeType;
  if (!mergeType || mergeType === 'manual') {
    return;
  }

  await github().put(
      `repos/${repoOwner}/pulls/${prDetails.number}/merge`,
      githubToken,
      {
        commit_title: prDetails.title,
        commit_message: prDetails.body,
        sha: prDetails.commit.oid,
        merge_method: automergeOpts.mergeType,
      },
  );
}
