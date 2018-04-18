import * as express from 'express';

import * as api from '../../types/api';
import {userModel, UserRecord} from '../models/userModel';
import {getMyRepos} from '../utils/my-repos';

import {APIResponse} from './api-router/abstract-api-router';
import {PrivateAPIRouter} from './api-router/private-api-router';
import * as responseHelper from './api-router/response-helper';

/**
 * Fetches the user profile of the authenticated user. Emulation of another user
 * is forbidden here.
 */
async function handlerUser(
    _request: express.Request, userRecord: UserRecord): Promise<APIResponse> {
  let repos = userRecord.repos;
  if (!repos) {
    repos = await getMyRepos(userRecord.username, userRecord.githubToken);
    userModel.updateRepos(userRecord.username, repos);
  }

  return responseHelper.data<api.UserResponse>({
    login: userRecord.username,
    avatarUrl: userRecord.avatarUrl,
    repos,
  });
}

export function getRouter(): express.Router {
  const userRouter = new PrivateAPIRouter();
  userRouter.get('/', handlerUser);
  return userRouter.router;
}
