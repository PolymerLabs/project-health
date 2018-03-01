import {firestore} from '../../utils/firestore';
import {github} from '../../utils/github';

const REPO_COLLECTION_NAME = 'repositories';
// 7 Days
export const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000;

export type RepoDetails = {
  allow_rebase_merge: boolean; allow_squash_merge: boolean;
  allow_merge_commit: boolean;
  updateTimestamp: number;
};

class RepositoryModel {
  private getDocName(owner: string, repo: string) {
    return `${owner}-${repo}`;
  }

  private validateDetails(details: RepoDetails): boolean {
    if (details.updateTimestamp < Date.now() - MAX_CACHE_AGE) {
      return false;
    }

    return true;
  }

  async getRepositoryDetails(githubToken: string, owner: string, repo: string):
      Promise<RepoDetails> {
    const repoDoc = await firestore()
                        .collection(REPO_COLLECTION_NAME)
                        .doc(this.getDocName(owner, repo));
    const repoSnapshot = await repoDoc.get();
    if (repoSnapshot.exists) {
      const details = repoSnapshot.data() as RepoDetails;
      if (this.validateDetails(details)) {
        return details;
      }
    }

    const response = await github().get(`repos/${owner}/${repo}`, githubToken);
    if (response.error) {
      throw new Error(response.message);
    }

    const prDetails = {
      allow_rebase_merge: response.allow_rebase_merge,
      allow_squash_merge: response.allow_squash_merge,
      allow_merge_commit: response.allow_merge_commit,
      updateTimestamp: Date.now(),
    } as RepoDetails;

    await repoDoc.set(prDetails);

    return prDetails;
  }

  async deleteRepository(owner: string, repo: string): Promise<void> {
    await firestore()
        .collection(REPO_COLLECTION_NAME)
        .doc(this.getDocName(owner, repo))
        .delete();
  }
}

export const repositoryModel = new RepositoryModel();
