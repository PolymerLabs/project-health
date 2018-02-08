import * as express from 'express';
import gql from 'graphql-tag';

import {ViewerLoginQuery} from '../../types/gql-types';
import {GitHub} from '../../utils/github';

interface LoginDetails {
  username: string;
  token: string;
  scopes: string[]|null;
}

class UserModel {
  private cachedLogins: {[id: string]: LoginDetails};

  constructor() {
    // TODO: Move this to Firestore instead of in memory.
    this.cachedLogins = {};
  }

  async getLoginFromRequest(github: GitHub, request: express.Request):
      Promise<LoginDetails|null> {
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

    try {
      return await this.addNewUser(github, token, null);
    } catch (err) {
      // If adding the user errors, then the token is no longer valid.
      return null;
    }
  }

  async addNewUser(github: GitHub, token: string, scopes: string[]|null) {
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
