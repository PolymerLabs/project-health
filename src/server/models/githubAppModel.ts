import {firestore} from '../../utils/firestore';

const GITHUB_APP_COLLECTION_NAME = 'github-apps';
const GITHUB_APP_REPO_COLLECTION_NAME = 'repositories';

export interface GithubRepo {
  id: string;
  databaseId: number;
  name: string;
  nameWithOwner: string;
}

interface GithubAppInstall {
  installationId: number;
  permissions: {[name: string]: string;};
  events: string[];
  repository_selection: 'all'|'selected';
  type: 'User'|'Organization';
  login: string;
  avatar_url: string;
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

  async deleteInstallation(installLogin: string): Promise<void> {
    const installDocRef = await firestore()
                              .collection(GITHUB_APP_COLLECTION_NAME)
                              .doc(installLogin);
    const docSnapshot = await installDocRef.get();
    if (docSnapshot.exists) {
      await installDocRef.delete();
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

  /**
   * Removes repos specified by name.
   */
  async removeRepos(orgOrUser: string, repoNames: string[]) {
    if (!repoNames.length) {
      return false;
    }

    return firestore().runTransaction(async (transaction) => {
      const repos = await firestore()
                        .collection(GITHUB_APP_COLLECTION_NAME)
                        .doc(orgOrUser)
                        .collection(GITHUB_APP_REPO_COLLECTION_NAME)
                        .get();

      for (const doc of repos.docs) {
        const data = doc.data() as GithubRepo;
        if (repoNames.includes(data.name)) {
          transaction.delete(doc.ref);
        }
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

  async getInstallationByOrgOrUserName(orgOrUser: string):
      Promise<GithubAppInstall|null> {
    const repoDocSnapshot = await firestore()
                                .collection(GITHUB_APP_COLLECTION_NAME)
                                .doc(orgOrUser)
                                .get();
    if (!repoDocSnapshot.exists) {
      return null;
    }
    return repoDocSnapshot.data() as GithubAppInstall;
  }

  async isAppInstalledOnRepo(orgOrUser: string, repoId: string):
      Promise<boolean> {
    const repoDocRef = await firestore()
                           .collection(GITHUB_APP_COLLECTION_NAME)
                           .doc(orgOrUser)
                           .collection(GITHUB_APP_REPO_COLLECTION_NAME)
                           .doc(repoId)
                           .get();
    return repoDocRef.exists;
  }

  async getRepos(orgOrUser: string): Promise<GithubRepo[]> {
    const repoDocSnapshot = await firestore()
                                .collection(GITHUB_APP_COLLECTION_NAME)
                                .doc(orgOrUser)
                                .collection(GITHUB_APP_REPO_COLLECTION_NAME)
                                .get();

    const repos: GithubRepo[] = [];
    for (const doc of repoDocSnapshot.docs) {
      const data = doc.data();
      if (!data) {
        continue;
      }
      repos.push(data as GithubRepo);
    }
    return repos;
  }
}

export const githubAppModel = new GithubAppsModel();
