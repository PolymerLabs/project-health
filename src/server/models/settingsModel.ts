import * as JSON5 from 'json5';

import {OrgSettings} from '../../types/api';
import {firestore} from '../../utils/firestore';

const ORG_SETTINGS_COLLECTION_NAME = 'org-settings';

class SettingsModel {
  async getOrgSettings(orgId: string): Promise<OrgSettings|null> {
    const orgDocRef =
        await firestore().collection(ORG_SETTINGS_COLLECTION_NAME).doc(orgId);

    const snapshot = await orgDocRef.get();
    if (!snapshot.exists) {
      return null;
    }

    return snapshot.data() as OrgSettings;
  }

  async setOrgSettings(orgId: string, newSettings: string, editor: string) {
    try {
      JSON5.parse(newSettings);
    } catch (e) {
      throw new Error('Settings are not valid JSON5.');
    }

    const orgDocRef =
        await firestore().collection(ORG_SETTINGS_COLLECTION_NAME).doc(orgId);

    const snapshot = await orgDocRef.get();
    let editorsList: string[] = [];
    if (snapshot.exists) {
      const previousConfig = snapshot.data() as OrgSettings;
      editorsList = previousConfig.editors;
    }

    if (editorsList.indexOf(editor) === -1) {
      editorsList.push(editor);
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
