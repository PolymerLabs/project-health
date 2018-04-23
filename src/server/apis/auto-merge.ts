import * as express from 'express';

import {GenericStatusResponse} from '../../types/api';
import {pullRequestsModel} from '../models/pullRequestsModel';

import {APIResponse} from './api-router/abstract-api-router';
import {PrivateAPIRouter} from './api-router/private-api-router';
import * as responseHelper from './api-router/response-helper';

export async function handleSetMergeOpt(request: express.Request):
    Promise<APIResponse<GenericStatusResponse>> {
  const owner = request.body.owner;
  const repo = request.body.repo;
  const num = request.body.number;
  const automergeOption = request.body.automergeOption;

  if (!automergeOption) {
    return responseHelper.error(
        'no-automerge-option', 'You must provide an auto-merge option.');
  }

  if (!owner) {
    return responseHelper.error('no-owner', 'You must provide an owner.');
  }

  if (!repo) {
    return responseHelper.error('no-repo', 'You must provide a repo.');
  }

  if (typeof num !== 'number') {
    return responseHelper.error(
        'no-pr-number', 'You must provide a valid PR number.');
  }

  await pullRequestsModel.setAutomergeOptions(
      owner, repo, num, automergeOption);

  return responseHelper.data<GenericStatusResponse>({
    status: 'ok',
  });
}

export function getRouter(): express.Router {
  const automergeRouter = new PrivateAPIRouter();
  automergeRouter.post('/set-merge-option/', handleSetMergeOpt, {
    requireBody: true,
  });
  return automergeRouter.router;
}
