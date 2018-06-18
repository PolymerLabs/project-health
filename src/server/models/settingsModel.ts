import * as JSON5 from 'json5';

import {OrgSettings} from '../../types/api';
import {firestore} from '../../utils/firestore';
import {github} from '../../utils/github';
import {settings} from '../controllers/github-app-settings';
import {generateGithubAppToken} from '../utils/generate-github-app-token';

import {githubAppModel} from './githubAppModel';
import {UserRecord} from './userModel';

const ORG_SETTINGS_COLLECTION_NAME = 'org-settings';

class SettingsModel {
  private async canAccessAPI(orgOrUser: string, userRecord: UserRecord):
      Promise<boolean> {
    if (orgOrUser === userRecord.username) {
      // The user can access their own settings for their account.
      return true;
    }

    const installDetails =
        await githubAppModel.getInstallationByOrgOrUserName(orgOrUser);
    if (!installDetails) {
      throw new Error(
          `The GitHub application is not installed for '${orgOrUser}'`);
    }

    const token = await generateGithubAppToken(installDetails.installationId);

    try {
      const response = await github().get(
          `orgs/${orgOrUser}/memberships/${userRecord.username}`, token);
      const result = await response.json();

      if (result.state === 'active' && result.role === 'admin') {
        return true;
      }
    } catch (err) {
      console.warn(
          `Settings could not confirm membership of ${userRecord.username} in ${
              orgOrUser}.`,
          err.message);
    }

    return false;
  }

  async getOrgSettings(orgOrUser: string, userRecord: UserRecord):
      Promise<OrgSettings|null> {
    if (!await this.canAccessAPI(orgOrUser, userRecord)) {
      throw new Error('User does not have permission to access this data.');
    }
    const orgDocRef = await firestore()
                          .collection(ORG_SETTINGS_COLLECTION_NAME)
                          .doc(orgOrUser);

    const snapshot = await orgDocRef.get();
    if (!snapshot.exists) {
      return null;
    }

    return snapshot.data() as OrgSettings;
  }

  async setOrgSettings(
      orgOrUser: string,
      newSettings: string,
      userRecord: UserRecord) {
    if (!await this.canAccessAPI(orgOrUser, userRecord)) {
      throw new Error('User does not have permission to access this data.');
    }

    let parsedValues;
    try {
      parsedValues = JSON5.parse(newSettings);
    } catch (e) {
      throw new Error('Settings are not valid JSON5.');
    }

    settings.validate(parsedValues);

    const orgDocRef = await firestore()
                          .collection(ORG_SETTINGS_COLLECTION_NAME)
                          .doc(orgOrUser);

    const snapshot = await orgDocRef.get();
    let editorsList: string[] = [];
    if (snapshot.exists) {
      const previousConfig = snapshot.data() as OrgSettings;
      editorsList = previousConfig.editors;
    }

    if (editorsList.indexOf(userRecord.username) === -1) {
      editorsList.push(userRecord.username);
    }

    const newConfig = {
      fileContents: newSettings,
      lastUpdated: Date.now(),
      editors: editorsList,
    };

    await orgDocRef.set(newConfig);
  }
}

export const settingsModel = new SettingsModel();
