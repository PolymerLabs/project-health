import * as express from 'express';
import gql from 'graphql-tag';

import {GitHub} from '../../utils/github';
import {ViewerLoginQuery} from '../../types/gql-types';

type LoginDetails = {
  username: string;
  token: string;
  scopes: string[];
}

class UserModel {
  private cachedLogins: {[id: string]: LoginDetails};

  constructor() {
    // TODO: Move this to Firestore instead of in memory.
    this.cachedLogins = {};
  }

  async getLoginFromRequest(request: express.Request): Promise<LoginDetails | null> {
    if (!request.cookies) {
      return null;
    }
  
    const token = request.cookies['id'];
    if (!token) {
      return null;
    }
  
    if (this.cachedLogins[token]) {
      return this.cachedLogins[token];
    }
  
    return null;
  }

  async addNewUser(github: GitHub, token: string, scopes: string[]) {
    const loginResult = await github.query<ViewerLoginQuery>({
      query: viewerLoginQuery,
      fetchPolicy: 'network-only',
      context: {token},
    });

    const details = {
      username: loginResult.data.viewer.login,
      token,
      scopes,
    };

    this.cachedLogins[token] = details;

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