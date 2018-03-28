import {github} from '../../utils/github';

import {PullRequestDetails} from './get-pr-from-commit';

export async function performAutomerge(
    githubToken: string,
    prDetails: PullRequestDetails,
    mergeType: 'squash'|'rebase'|'merge'): Promise<void> {
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
}
