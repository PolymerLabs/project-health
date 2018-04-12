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

interface GithubRepo {
  id: string;
  restId: number;
  name: string;
  full_name: string;
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

  async addRepo(orgOrUser: string, repoData: GithubRepo) {
    const repoDocRef = await firestore()
                           .collection(GITHUB_APP_COLLECTION_NAME)
                           .doc(orgOrUser)
                           .collection(GITHUB_APP_REPO_COLLECTION_NAME)
                           .doc(repoData.id);
    await repoDocRef.set(repoData);
  }
}

export const githubAppModel = new GithubAppsModel();
