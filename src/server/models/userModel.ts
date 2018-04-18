import {FieldValue} from '@google-cloud/firestore';
import * as crypto from 'crypto';
import * as express from 'express';
import gql from 'graphql-tag';

import * as api from '../../types/api';
import {ViewerLoginQuery} from '../../types/gql-types';
import {firestore} from '../../utils/firestore';
import {github} from '../../utils/github';

export const ID_COOKIE_NAME = 'health-id';
export const USERS_COLLECTION_NAME = 'users';
export const METADATA_COLLECTION_NAME = 'metadata';
export const TOKEN_COLLECTION_NAME = 'user-tokens';

export const REQUIRED_SCOPES = ['repo'];

export interface FeatureDetails {
  enabledAt: number;
}

export interface UserRecord {
  githubToken: string;
  scopes: string[];
  username: string;
  fullname: string|null;
  avatarUrl: string|null;
  lastKnownUpdate: string|null;
  featureLastViewed: FeatureDetails;
  repos: api.Repository[]|null;
}

/**
 * The structure of the data base is:
 *
 * - users/
 *   - <username>
 *     - subscriptions (See PushSubscriptionsModel)
 *     - githubToken
 *     - githubTokenScopes[]
 *     - username
 *     - metadata/
 *         - last-viewed/
 *             - <GitHub Issue ID>: <Last Viewed Timestamp>
 *     - repos[]
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
    if (!userRecord.githubToken || typeof userRecord.githubToken !== 'string') {
      console.warn(`Invalid githubToken: '${userRecord.githubToken}'`);
      return false;
    }

    if (!userRecord.scopes || !Array.isArray(userRecord.scopes)) {
      console.warn(`Invalid scopes: '${userRecord.scopes}'`);
      return false;
    }

    for (const scope of REQUIRED_SCOPES) {
      if (userRecord.scopes.indexOf(scope) === -1) {
        console.warn(`Missing required scope: '${scope}'`);
        return false;
      }
    }

    if (!userRecord.username || typeof userRecord.username !== 'string') {
      console.warn(`Invalid username: '${userRecord.username}'`);
      return false;
    }

    if (typeof userRecord.featureLastViewed === 'undefined') {
      console.warn(
          `Invalid featureLastViewed: '${userRecord.featureLastViewed}'`);
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

    const latestDetails = {
      username,
      avatarUrl: loginResult.data.viewer.avatarUrl,
      fullname: loginResult.data.viewer.name,
      scopes,
      githubToken,
    };
    const defaultValues = {
      lastKnownUpdate: null,
      featureLastViewed: {
        enabledAt: Date.now(),
      },
      repos: null,
    };

    const existingUserSnapshot = await userDocument.get();
    const existingData = existingUserSnapshot.data() || {};

    const details = Object.assign(defaultValues, existingData, latestDetails);

    // Final validation - this should never fail!
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

  async updateLastViewed(username: string, issueId: string, timestamp: number) {
    const doc = await firestore()
                    .collection(USERS_COLLECTION_NAME)
                    .doc(username)
                    .collection(METADATA_COLLECTION_NAME)
                    .doc('last-viewed');
    const docSnapshot = await doc.get();
    if (docSnapshot.exists) {
      await doc.update({
        [issueId]: timestamp,
      });
    } else {
      await doc.create({
        [issueId]: timestamp,
      });
    }
  }

  async getAllLastViewedInfo(username: string):
      Promise<{[issue: string]: number}> {
    const doc = await firestore()
                    .collection(USERS_COLLECTION_NAME)
                    .doc(username)
                    .collection(METADATA_COLLECTION_NAME)
                    .doc('last-viewed');
    const docSnapshot = await doc.get();
    if (!docSnapshot.exists) {
      return {};
    }

    const data = docSnapshot.data();
    if (!data) {
      return {};
    }

    return data;
  }

  async updateRepos(username: string, repos: api.Repository[]) {
    const doc =
        await firestore().collection(USERS_COLLECTION_NAME).doc(username);
    const docSnapshot = await doc.get();
    if (docSnapshot.exists) {
      await doc.update({repos});
    }
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
