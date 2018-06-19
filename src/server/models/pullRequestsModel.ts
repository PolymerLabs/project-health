import {AutomergeSelection} from '../../types/api';
import {firestore} from '../../utils/firestore';

const PR_COLLECTION_NAME = 'pull-requests';

type Status = 'error'|'failure'|'pending'|'success';

// TODO: this is a confusing name, given that PullRequestsDetail already exists.
export type PRDetails = {
  commits?: {[key: string]: CommitDetails};
  automerge?: AutomergeSelection;
  open?: boolean;
};

export type CommitDetails = {
  status: Status;
};

class PullRequestsModel {
  private getDocID(owner: string, repo: string, num: number) {
    if (!owner) {
      throw new Error('No owner.');
    }

    if (!repo) {
      throw new Error('No repo.');
    }

    if (typeof num !== 'number') {
      throw new Error('No num.');
    }
    return `${owner}~${repo}~${num}`;
  }

  async pullRequestOpened(owner: string, repo: string, num: number) {
    const prDoc = await firestore()
                      .collection(PR_COLLECTION_NAME)
                      .doc(this.getDocID(owner, repo, num));
    const snapshot = await prDoc.get();
    if (snapshot.exists) {
      await prDoc.update({
        open: true,
      });
    } else {
      await prDoc.set({
        open: true,
      });
    }
  }

  async getPRData(owner: string, repo: string, num: number):
      Promise<null|PRDetails> {
    const prSnapshot = await firestore()
                           .collection(PR_COLLECTION_NAME)
                           .doc(this.getDocID(owner, repo, num))
                           .get();
    if (!prSnapshot.exists) {
      return null;
    }

    return prSnapshot.data() as PRDetails;
  }

  async setCommitStatus(
      owner: string,
      repo: string,
      num: number,
      commitId: string,
      status: Status) {
    const prDoc = await firestore()
                      .collection(PR_COLLECTION_NAME)
                      .doc(this.getDocID(owner, repo, num));
    const snapshot = await prDoc.get();
    let currentData = snapshot.data();
    if (!currentData) {
      currentData = {} as PRDetails;
    }

    if (!currentData.commits) {
      currentData.commits = {};
    }

    if (!currentData.commits[commitId]) {
      currentData.commits[commitId] = {};
    }

    currentData.commits[commitId].status = status;

    if (snapshot.exists) {
      await prDoc.update(currentData);
    } else {
      await prDoc.set(currentData);
    }
  }

  async getCommitDetails(
      owner: string,
      repo: string,
      num: number,
      commitId: string,
      ): Promise<null|CommitDetails> {
    const prSnapshot = await firestore()
                           .collection(PR_COLLECTION_NAME)
                           .doc(this.getDocID(owner, repo, num))
                           .get();
    if (!prSnapshot.exists) {
      return null;
    }

    const prData = prSnapshot.data() as PRDetails;
    if (!prData || !prData.commits || !prData.commits[commitId]) {
      return null;
    }

    return prData.commits[commitId];
  }

  async getAutomergeOpts(owner: string, repo: string, num: number):
      Promise<null|AutomergeSelection> {
    const prSnapshot = await firestore()
                           .collection(PR_COLLECTION_NAME)
                           .doc(this.getDocID(owner, repo, num))
                           .get();
    if (!prSnapshot.exists) {
      return null;
    }

    const prData = prSnapshot.data() as PRDetails;
    if (!prData.automerge) {
      return null;
    }

    return prData.automerge;
  }

  async setAutomergeOptions(
      owner: string,
      repo: string,
      num: number,
      mergeType: 'manual'|'merge'|'squash'|'rebase',
  ) {
    const prDoc = await firestore()
                      .collection(PR_COLLECTION_NAME)
                      .doc(this.getDocID(owner, repo, num));
    const snapshot = await prDoc.get();
    let currentData = snapshot.data();
    if (!currentData) {
      currentData = {
        commits: {},
      } as PRDetails;
    }

    if (!currentData.automerge) {
      currentData.automerge = {};
    }

    currentData.automerge.mergeType = mergeType;

    if (snapshot.exists) {
      await prDoc.update(currentData);
    } else {
      await prDoc.set(currentData);
    }
  }

  async deletePR(owner: string, repo: string, num: number): Promise<void> {
    await firestore()
        .collection(PR_COLLECTION_NAME)
        .doc(this.getDocID(owner, repo, num))
        .delete();
  }
}

export const pullRequestsModel = new PullRequestsModel();
