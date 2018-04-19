import {GithubAppInstall} from '../../types/api';
import {firestore} from '../../utils/firestore';

const GITHUB_APP_COLLECTION_NAME = 'github-apps';
const GITHUB_APP_REPO_COLLECTION_NAME = 'repositories';

export interface GithubRepo {
  id: string;
  databaseId: number;
  name: string;
  nameWithOwner: string;
}

class GithubAppsModel {
  async addInstallation(installData: GithubAppInstall): Promise<void> {
    const installDocRef = await firestore()
                              .collection(GITHUB_APP_COLLECTION_NAME)
                              .doc(installData.login);
    const docSnapshot = await installDocRef.get();
    if (docSnapshot.exists) {
      installDocRef.update(installData);
    } else {
      installDocRef.create(installData);
    }
  }

  async addRepos(orgOrUser: string, allRepos: GithubRepo[]) {
    return firestore().runTransaction(async (transaction) => {
      for (const repo of allRepos) {
        const repoDocRef = await firestore()
                               .collection(GITHUB_APP_COLLECTION_NAME)
                               .doc(orgOrUser)
                               .collection(GITHUB_APP_REPO_COLLECTION_NAME)
                               .doc(repo.id);
        transaction.set(repoDocRef, repo);
      }
      return true;
    });
  }

  async getInstallation(installId: number): Promise<GithubAppInstall|null> {
    const githubCollection =
        await firestore().collection(GITHUB_APP_COLLECTION_NAME);

    const querySnapshot =
        await githubCollection.where('installationId', '==', installId).get();
    if (querySnapshot.docs.length === 0) {
      return null;
    } else if (querySnapshot.docs.length > 1) {
      throw new Error(`Found multiple docs linked to ID: ${installId}`);
    } else {
      return querySnapshot.docs[0].data() as GithubAppInstall;
    }
  }
}

export const githubAppModel = new GithubAppsModel();
