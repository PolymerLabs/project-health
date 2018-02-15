import * as express from 'express';
import gql from 'graphql-tag';

import {ViewerLoginQuery} from '../../types/gql-types';
import {firestore} from '../../utils/firestore';
import {github} from '../../utils/github';

const TOKEN_COLLECTION_NAME = 'githubTokens';

export interface LoginDetails {
  username: string;
  githubToken: string;
  scopes: string[]|null;
}

/**
 * The structure of the data base is:
 *
 * - githubTokens
 *   - <GitHub Token>
 *     - username
 *     - githubToken
 *     - scopes
 */
class UserModel {
  async getLoginDetails(login: string): Promise<LoginDetails|null> {
    const tokensCollection =
        await firestore().collection(TOKEN_COLLECTION_NAME);

    const query = await tokensCollection.where('username', '==', login).get();
    if (query.empty) {
      return null;
    }

    const loginDetails = query.docs[0].data();
    if (!loginDetails) {
      return null;
    }

    return loginDetails as LoginDetails;
  }

  async getLoginFromRequest(request: express.Request):
      Promise<LoginDetails|null> {
    if (!request.cookies) {
      return null;
    }

    const token = request.cookies['id'];
    if (!token) {
      return null;
    }

    const tokenDoc =
        await firestore().collection(TOKEN_COLLECTION_NAME).doc(token).get();

    if (tokenDoc.exists) {
      const data = tokenDoc.data();
      if (data) {
        return data as LoginDetails;
      }
    }

    try {
      return await this.addNewUser(token, null);
    } catch (err) {
      // If adding the user errors, then the token is no longer valid.
      return null;
    }
  }

  async addNewUser(token: string, scopes: string[]|null) {
    const loginResult = await github().query<ViewerLoginQuery>({
      query: viewerLoginQuery,
      fetchPolicy: 'network-only',
      context: {token},
    });

    const userTokenDoc =
        await firestore().collection(TOKEN_COLLECTION_NAME).doc(token);

    const details = {
      username: loginResult.data.viewer.login,
      scopes,
      githubToken: token,
    };

    await userTokenDoc.set(details);

    return details;
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
