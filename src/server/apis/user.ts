import * as express from 'express';
import gql from 'graphql-tag';

import * as api from '../../types/api';
import {VerifyRepoQuery, VerifyRepoQueryVariables} from '../../types/gql-types';
import {github} from '../../utils/github';
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
    return responseHelper.error('no-owner', 'Missing owner in request');
  }

  if (!name) {
    return responseHelper.error('no-name', 'Missing name in request');
  }

  const repos = userRecord.repos;
  if (!repos) {
    return responseHelper.error('no-repos', 'No repos found on user');
  }

  let i = 0;
  const oldLength = repos.length;
  for (i; i < repos.length; i++) {
    if (repos[i].owner === owner && repos[i].name === name) {
      repos.splice(i, 1);
      break;
    }
  }

  if (i === oldLength) {
    return responseHelper.error(
        'unknown-repo', 'Could not find repo to remove');
  }

  await userModel.updateRepos(userRecord.username, repos);
  return responseHelper.data({status: 'ok'});
}

export async function handleAddRepo(
    request: express.Request,
    userRecord: UserRecord): Promise<APIResponse<api.GenericStatusResponse>> {
  const nameWithOwner = request.body.nameWithOwner;

  if (!nameWithOwner) {
    return responseHelper.error('no-name-with-owner', 'No nameWithOwner found');
  }

  const split = nameWithOwner.split('/');

  if (split.length !== 2 || !split[0].length || !split[1].length) {
    return responseHelper.error('invalid-format', 'Not in format owner/repo');
  }

  const repos = userRecord.repos || [];
  const variables: VerifyRepoQueryVariables = {owner: split[0], repo: split[1]};

  try {
    const response = await github().query<VerifyRepoQuery>({
      query: verifyRepoQuery,
      variables,
      context: {token: userRecord.githubToken},
      fetchPolicy: 'network-only'
    });

    const repo = response.data.repository;
    if (!repo) {
      return responseHelper.error('bad-repo-info', 'Unable to find repo info');
    }
    repos.push({
      name: repo.name,
      owner: repo.owner.login,
      avatarUrl: repo.owner.avatarUrl,
    });
  } catch {
    return responseHelper.error('invalid-repo', 'Unable to find repo');
  }

  await userModel.updateRepos(userRecord.username, repos);
  return responseHelper.data({status: 'ok'});
}

export function getRouter(): express.Router {
  const userRouter = new PrivateAPIRouter();
  userRouter.get('/', handleUserRequest);
  userRouter.post('/remove-repo', handleRemoveRepo, {requireBody: true});
  userRouter.post('/add-repo', handleAddRepo, {requireBody: true});
  return userRouter.router;
}

const verifyRepoQuery = gql`
query VerifyRepo($owner: String!, $repo: String!){
  repository(owner: $owner, name: $repo) {
    name
    owner {
      login
      avatarUrl
    }
  }
}
`;
