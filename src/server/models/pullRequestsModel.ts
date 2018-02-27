import {firestore} from '../../utils/firestore';

const PR_COLLECTION_NAME = 'pull-requests';

type Status = 'error'|'failure'|'pending'|'success';

export type PRDetails = {
  commits: {[key: string]: CommitDetails};
};

export type CommitDetails = {
  status: Status;
};

class PullRequestsModel {
  async setCommitStatus(prId: number, commitId: string, status: Status) {
    const prDoc =
        await firestore().collection(PR_COLLECTION_NAME).doc(prId.toString());
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

  async getCommitDetails(prId: number, commitId: string):
      Promise<null|CommitDetails> {
    const prSnapshot = await firestore()
                           .collection(PR_COLLECTION_NAME)
                           .doc(prId.toString())
                           .get();
    if (!prSnapshot.exists) {
      return null;
    }

    const prData = prSnapshot.data() as PRDetails;
    if (!prData.commits[commitId]) {
      return null;
    }

    return prData.commits[commitId];
  }

  async deletePR(prId: number): Promise<void> {
    await firestore()
        .collection(PR_COLLECTION_NAME)
        .doc(prId.toString())
        .delete();
  }
}

export const pullRequestsModel = new PullRequestsModel();
