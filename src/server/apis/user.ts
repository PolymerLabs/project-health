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
    _request: express.Request, userRecord: UserRecord): Promise<APIResponse> {
  let repos = userRecord.repos;
  if (!repos) {
    repos =
        await generateMyRepoList(userRecord.username, userRecord.githubToken);
    await userModel.updateRepos(userRecord.username, repos);
  }

  return responseHelper.data<api.UserResponse>({
    login: userRecord.username,
    avatarUrl: userRecord.avatarUrl,
    repos,
  });
}

export async function handleRemoveRepo(
    request: express.Request, userRecord: UserRecord): Promise<APIResponse> {
  const owner = request.body.owner;
  const name = request.body.name;

  if (!owner || !name) {
    return responseHelper.error(
        'invalid-request', 'Missing owner/name from request');
  }

  const oldRepos = userRecord.repos;
  const newRepos = [];
  if (!oldRepos) {
    return responseHelper.error('no-repos', 'No repos found on user');
  }

  for (const repo of oldRepos) {
    if (repo.owner !== owner || repo.name !== name) {
      newRepos.push(repo);
    }
  }

  if (oldRepos.length === newRepos.length) {
    return responseHelper.error(
        'unknown-repo', 'Could not find repo to remove');
  }

  await userModel.updateRepos(userRecord.username, newRepos);
  return responseHelper.data<api.GenericStatusResponse>({status: 'ok'});
}

export function getRouter(): express.Router {
  const userRouter = new PrivateAPIRouter();
  userRouter.get('/', handleUserRequest);
  userRouter.post('/remove-repo', handleRemoveRepo, {requireBody: true});
  return userRouter.router;
}
