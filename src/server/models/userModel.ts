import {FieldValue} from '@google-cloud/firestore';
import * as crypto from 'crypto';
import * as express from 'express';
import gql from 'graphql-tag';

import {ViewerLoginQuery} from '../../types/gql-types';
import {firestore} from '../../utils/firestore';
import {github} from '../../utils/github';

export const ID_COOKIE_NAME = 'health-id';
export const USERS_COLLECTION_NAME = 'users';
export const TOKEN_COLLECTION_NAME = 'user-tokens';

export const REQUIRED_SCOPES = ['repo'];

export interface UserRecord {
  githubToken: string;
  scopes: string[];
  username: string;
  fullname: string|null;
  avatarUrl: string|null;
  lastKnownUpdate: string|null;
  'feature-lastViewed'?: {enabledAt: number;};
}

type FeatureID = 'feature-lastViewed';

/**
 * The structure of the data base is:
 *
 * - users/
 *   - <username>
 *     - subscriptions (See PushSubscriptionsModel)
 *     - githubToken
 *     - githubTokenScopes[]
 *     - username
 *
 * - user-tokens/
 *   - <Random Token>
 *     - username
 *     - creationTime
 */
class UserModel {
  /**
   * A very simple validation step to ensure a users set of details
   * is what we expect, want and need.
   *
   * @private
   */
  validateDetails(userRecord: UserRecord): boolean {
    if (!userRecord.githubToken) {
      return false;
    }

    if (!userRecord.scopes) {
      return false;
    }

    for (const scope of REQUIRED_SCOPES) {
      if (userRecord.scopes.indexOf(scope) === -1) {
        return false;
      }
    }

    if (!userRecord.username) {
      return false;
    }

    if (typeof userRecord.fullname === 'undefined') {
      return false;
    }

    if (typeof userRecord.avatarUrl === 'undefined') {
      return false;
    }

    return true;
  }

  async generateNewUserToken(githubToken: string, scopes: string[]):
      Promise<string> {
    const loginResult = await github().query<ViewerLoginQuery>({
      query: viewerLoginQuery,
      fetchPolicy: 'network-only',
      context: {token: githubToken},
    });

    const username = loginResult.data.viewer.login;

    const userDocument =
        await firestore().collection(USERS_COLLECTION_NAME).doc(username);

    const details: UserRecord = {
      username,
      avatarUrl: loginResult.data.viewer.avatarUrl,
      fullname: loginResult.data.viewer.name,
      scopes,
      githubToken,
      lastKnownUpdate: null,
    };

    if (!this.validateDetails(details)) {
      throw new Error('New user info is invalid.');
    }

    await userDocument.set(details);

    const userToken = crypto.randomBytes(20).toString('hex');
    const tokenDocument =
        await firestore().collection(TOKEN_COLLECTION_NAME).doc(userToken);
    await tokenDocument.set({
      username,
      creationTime: FieldValue.serverTimestamp(),
    });
    return userToken;
  }

  async deleteUserToken(userToken: string) {
    await firestore().collection(TOKEN_COLLECTION_NAME).doc(userToken).delete();
  }

  async deleteUser(username: string) {
    await firestore().collection(USERS_COLLECTION_NAME).doc(username).delete();
  }

  /**
   * This is used by last known update to inform dashboard clients that
   * there is an update in Github.
   * @param username
   */
  async markUserForUpdate(username: string) {
    const doc =
        await firestore().collection(USERS_COLLECTION_NAME).doc(username);
    const docSnapshot = await doc.get();
    if (docSnapshot.exists) {
      doc.update({
        lastKnownUpdate: FieldValue.serverTimestamp(),
      });
    }
  }

  // tslint:disable-next-line:no-any
  async setFeatureData(username: string, featureId: FeatureID, data: any) {
    const userRecord = await this.getUserRecord(username);
    if (!userRecord) {
      throw new Error('Cannot set feature data for a non-existent user.');
    }

    const doc =
        await firestore().collection(USERS_COLLECTION_NAME).doc(username);
    doc.update({
      [featureId]: data,
    });
  }

  async getUserRecord(username: string): Promise<UserRecord|null> {
    const doc =
        await firestore().collection(USERS_COLLECTION_NAME).doc(username);
    const docSnapshot = await doc.get();
    const data = docSnapshot.data();
    if (!data) {
      // Document doesn't exist.
      return null;
    }

    const userRecord = data as UserRecord;
    if (!this.validateDetails(userRecord)) {
      return null;
    }
    return userRecord;
  }

  async getUserRecordFromRequest(req: express.Request) {
    return this.getUserRecordFromToken(req.cookies[ID_COOKIE_NAME]);
  }

  async getUserRecordFromToken(userToken: string|
                               undefined): Promise<UserRecord|null> {
    if (!userToken) {
      return null;
    }

    const tokenDoc = await firestore()
                         .collection(TOKEN_COLLECTION_NAME)
                         .doc(userToken)
                         .get();
    const tokenData = tokenDoc.data();
    if (!tokenData || !tokenData.username) {
      return null;
    }

    return this.getUserRecord(tokenData.username);
  }
}

export const userModel = new UserModel();

const viewerLoginQuery = gql`
query ViewerLogin {
  viewer {
    login
    avatarUrl
    name
  }
}
`;
