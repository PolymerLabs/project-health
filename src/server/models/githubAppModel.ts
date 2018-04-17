import {firestore} from '../../utils/firestore';

const GITHUB_APP_COLLECTION_NAME = 'github-apps';
const GITHUB_APP_REPO_COLLECTION_NAME = 'repositories';

interface GithubAppInstall {
  installationId: number;
  permissions: {[name: string]: string;};
  events: string[];
  repository_selection: 'all'|'selected';
  type: 'User'|'Organization';
  login: string;
  avatar_url: string;
}

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
}

export const githubAppModel = new GithubAppsModel();
