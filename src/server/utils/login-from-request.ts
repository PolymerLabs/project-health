import * as express from 'express';
import gql from 'graphql-tag';

import {GitHub} from '../../utils/github';
import {ViewerLoginQuery} from '../../types/gql-types';

class LoginDetails {
  public username: string;
  public token: string;
}

// TODO: Move this to Firestore instead of in memory.
const cachedLogins: {[id: string]: LoginDetails} = {};

async function getLoginFromRequest(github: GitHub, request: express.Request): Promise<LoginDetails | null> {
  if (!request.cookies) {
    return null;
  }

  const token = request.cookies['id'];
  if (!token) {
    return null;
  }
  
  if (cachedLogins[token]) {
    return cachedLogins[token];
  }

  const loginResult = await github.query<ViewerLoginQuery>({
      query: viewerLoginQuery,
      fetchPolicy: 'network-only',
      context: {token},
  });

  const details = {
    username: loginResult.data.viewer.login,
    token,
  };

  cachedLogins[token] = details;

  return details;
};

export {getLoginFromRequest};

const viewerLoginQuery = gql`
query ViewerLogin {
  viewer {
    login
  }
}
`;