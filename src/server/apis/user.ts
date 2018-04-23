import * as express from 'express';

import * as api from '../../types/api';
import {userModel, UserRecord} from '../models/userModel';
import {generateMyRepoList} from '../utils/my-repos';

import {APIResponse} from './api-router/abstract-api-router';
import {PrivateAPIRouter} from './api-router/private-api-router';
import * as responseHelper from './api-router/response-helper';

/**
 * Fetches the user profile of the authenticated user. Emulation of another user
 * is forbidden here.
 */
export async function handleUserRequest(
    _request: express.Request,
    userRecord: UserRecord): Promise<APIResponse<api.UserResponse>> {
  let repos = userRecord.repos;
  if (!repos) {
    repos =
        await generateMyRepoList(userRecord.username, userRecord.githubToken);
    await userModel.updateRepos(userRecord.username, repos);
  }

  return responseHelper.data({
    login: userRecord.username,
    avatarUrl: userRecord.avatarUrl,
    repos,
  });
}

export async function handleRemoveRepo(
    request: express.Request,
    userRecord: UserRecord): Promise<APIResponse<api.GenericStatusResponse>> {
  const owner = request.body.owner;
  const name = request.body.name;

  if (!owner) {
    return responseHelper.error('invalid-request', 'Missing owner in request');
  }

  if (!name) {
    return responseHelper.error('invalid-request', 'Missing name in request');
  }

  const repos = userRecord.repos;
  if (!repos) {
    return responseHelper.error('no-repos', 'No repos found on user');
  }

  let i = 0;
  for (i; i < repos.length; i++) {
    if (repos[i].owner === owner && repos[i].name === name) {
      repos.splice(i, 1);
      break;
    }
  }

  if (i === repos.length) {
    return responseHelper.error(
        'unknown-repo', 'Could not find repo to remove');
  }

  await userModel.updateRepos(userRecord.username, repos);
  return responseHelper.data({status: 'ok'});
}

export function getRouter(): express.Router {
  const userRouter = new PrivateAPIRouter();
  userRouter.get('/', handleUserRequest);
  userRouter.post('/remove-repo', handleRemoveRepo, {requireBody: true});
  return userRouter.router;
}
