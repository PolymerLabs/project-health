import * as express from 'express';
import * as fs from 'fs-extra';
import * as path from 'path';

import {LastKnownResponse} from '../../types/api';
import {userModel, UserRecord} from '../models/userModel';

import {APIResponse} from './api-router/abstract-api-router';
import {PrivateAPIRouter} from './api-router/private-api-router';
import * as responseHelper from './api-router/response-helper';

async function handleLastKnownUpdate(
    request: express.Request,
    userRecord: UserRecord): Promise<APIResponse<LastKnownResponse>> {
  let lastKnownUpdate: string|null;
  if (!request.query.login) {
    lastKnownUpdate = userRecord.lastKnownUpdate;
  } else {
    const userDetails = await userModel.getUserRecord(request.query.login);
    if (!userDetails) {
      return responseHelper.error(
          'bad-login-request', 'User wasn\'t found in user model.');
    }

    lastKnownUpdate = userDetails.lastKnownUpdate;
  }

  let version = null;
  try {
    const pkg = await fs.readJSON(
        path.join(__dirname, '..', '..', '..', 'package.json'));
    version = pkg.version;
  } catch (err) {
    console.warn('Unable to read package.json');
  }

  return responseHelper.data<LastKnownResponse>({
    lastKnownUpdate,
    version,
  });
}

export function getRouter(): express.Router {
  const lastKnownUpdate = new PrivateAPIRouter();
  lastKnownUpdate.get('/last-known.json', handleLastKnownUpdate);
  return lastKnownUpdate.router;
}
