import {firestore} from '../../utils/firestore';

const PR_COLLECTION_NAME = 'pull-requests';

type Status = 'error'|'failure'|'pending'|'success';

export type PRDetails = {
  commits: {[key: string]: CommitDetails}; automerge: AutomergeOpts | undefined;
};

export type CommitDetails = {
  status: Status;
};

export type AutomergeOpts = {
  option: 'manual'|'merge'|'squash'|'rebase',
};

class PullRequestsModel {
  async setCommitStatus(prId: string, commitId: string, status: Status) {
    const prDoc = await firestore().collection(PR_COLLECTION_NAME).doc(prId);
    const snapshot = await prDoc.get();
    let currentData = snapshot.data();
    if (!currentData) {
      currentData = {
        commits: {},
      } as PRDetails;
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

  async getCommitDetails(prId: string, commitId: string):
      Promise<null|CommitDetails> {
    const prSnapshot =
        await firestore().collection(PR_COLLECTION_NAME).doc(prId).get();
    if (!prSnapshot.exists) {
      return null;
    }

    const prData = prSnapshot.data() as PRDetails;
    if (!prData.commits[commitId]) {
      return null;
    }

    return prData.commits[commitId];
  }

  async setAutomergeOptions(
      prId: string,
      opt: 'manual'|'merge'|'squash'|'rebase',
  ) {
    const prDoc = await firestore().collection(PR_COLLECTION_NAME).doc(prId);
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

    currentData.automerge.option = opt;

    if (snapshot.exists) {
      await prDoc.update(currentData);
    } else {
      await prDoc.set(currentData);
    }
  }

  async deletePR(prId: string): Promise<void> {
    await firestore().collection(PR_COLLECTION_NAME).doc(prId).delete();
  }
}

export const pullRequestsModel = new PullRequestsModel();
