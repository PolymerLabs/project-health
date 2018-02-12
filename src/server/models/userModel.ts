import * as express from 'express';
import gql from 'graphql-tag';

import {ViewerLoginQuery} from '../../types/gql-types';
import {github} from '../../utils/github';
import {firestore} from '../../utils/firestore';

interface LoginDetails {
  username: string;
  token: string;
  scopes: string[]|null;
}

class UserModel {
  async getLoginDetails(login: string): Promise<LoginDetails|null> {
    const tokensCollection = await firestore()
        .collection('tokens');

    const query = await tokensCollection.where('username', '==', login).get();
    if (query.empty) {
      return null;
    }
    
    const loginDetails = query.docs[0].data();
    if (!loginDetails) {
      return null;
    }
    
    return (loginDetails as LoginDetails);
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

    const tokenDoc = await firestore()
        .collection('tokens').doc(token).get();

    if (tokenDoc.exists) {
      const data = tokenDoc.data();
      if (data) {
        return (data as LoginDetails);
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

    const userTokenDoc = await firestore()
        .collection('tokens')
        .doc(token);

    const details = {
      username: loginResult.data.viewer.login,
      scopes,
      token,
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
