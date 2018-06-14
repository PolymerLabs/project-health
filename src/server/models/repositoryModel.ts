import {RepoDetails} from '../../types/api';
import {firestore} from '../../utils/firestore';
import {github} from '../../utils/github';
import {UserRecord} from './userModel';

const REPO_COLLECTION_NAME = 'repositories';
// 7 Days
export const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000;

export interface SavedRepoDetails extends RepoDetails {
  updateTimestamp: number|null;
}

class RepositoryModel {
  private getDocName(owner: string, repo: string) {
    return `${owner}-${repo}`;
  }

  private validateDetails(details: SavedRepoDetails): boolean {
    if (!details.updateTimestamp) {
      return false;
    }

    if (details.updateTimestamp < Date.now() - MAX_CACHE_AGE) {
      return false;
    }

    return true;
  }

  async getRepositoryDetails(
      userRecord: UserRecord,
      owner: string,
      repo: string): Promise<RepoDetails|null> {
    const repoDoc = await firestore()
                        .collection(REPO_COLLECTION_NAME)
                        .doc(this.getDocName(owner, repo));
    const repoSnapshot = await repoDoc.get();
    if (repoSnapshot.exists) {
      const details = repoSnapshot.data() as SavedRepoDetails;
      if (this.validateDetails(details)) {
        return {
          allow_rebase_merge: details.allow_rebase_merge,
          allow_squash_merge: details.allow_squash_merge,
          allow_merge_commit: details.allow_merge_commit,
        };
      }
    }

    const response =
        await github().get(`repos/${owner}/${repo}`, userRecord.githubToken);
    if (!response.ok) {
      console.error(`Get repo details threw an error: [${response.status}]: ${
          response.statusText}`);
      return null;
    }

    const result = await response.json();
    const requiredKeys = [
      'allow_rebase_merge',
      'allow_squash_merge',
      'allow_merge_commit',
    ];
    for (const key of requiredKeys) {
      if (typeof result[key] === 'undefined') {
        return null;
      }
    }

    const prDetails: RepoDetails = {
      allow_rebase_merge: result.allow_rebase_merge,
      allow_squash_merge: result.allow_squash_merge,
      allow_merge_commit: result.allow_merge_commit,
    };

    await repoDoc.set({
      ...prDetails,
      updateTimestamp: Date.now(),
    });

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
