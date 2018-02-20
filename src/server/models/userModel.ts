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

export interface LoginDetails {
  username: string;
  githubToken: string;
  scopes: string[]|null;
}

/**
 * The structure of the data base is:
 *
 * - users/
 *   - <username>
 *     - subscriptions[]
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
  async getLoginDetails(username: string): Promise<LoginDetails|null> {
    const userDoc =
        await firestore().collection(USERS_COLLECTION_NAME).doc(username).get();
    const userData = userDoc.data();
    if (!userData) {
      // Document doesn't exist.
      return null;
    }

    return userData as LoginDetails;
  }

  async getLoginFromRequest(req: express.Request) {
    return this.getLoginFromToken(req.cookies[ID_COOKIE_NAME]);
  }

  async getLoginFromToken(userToken: string|
                          undefined): Promise<LoginDetails|null> {
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

    return this.getLoginDetails(tokenData.username);
  }

  async generateNewUserToken(githubToken: string, scopes: string[]):
      Promise<string> {
    const loginResult = await github().query<ViewerLoginQuery>({
      query: viewerLoginQuery,
      fetchPolicy: 'network-only',
      context: {githubToken},
    });

    const username = loginResult.data.viewer.login;

    const userDocument =
        await firestore().collection(USERS_COLLECTION_NAME).doc(username);

    const details = {
      username,
      scopes,
      githubToken,
    };

    await userDocument.set(details);

    const userToken = crypto.randomBytes(20).toString('hex');
    const tokenDocument =
        await firestore().collection(TOKEN_COLLECTION_NAME).doc(userToken);
    tokenDocument.set({
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
}

export const userModel = new UserModel();

const viewerLoginQuery = gql`
query ViewerLogin {
  viewer {
    login
  }
}
`;
