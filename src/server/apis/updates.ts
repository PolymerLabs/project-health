import * as express from 'express';
import * as fs from 'fs-extra';
import * as path from 'path';

import {LastKnownResponse} from '../../types/api';
import {userModel} from '../models/userModel';

import {createAPIRoute, ResponseDetails} from './api-route';

async function handleLastKnownUpdate(request: express.Request):
    Promise<ResponseDetails<LastKnownResponse>> {
  const loginDetails = await userModel.getLoginFromRequest(request);
  if (!loginDetails) {
    return {
      statusCode: 401,
      error: {
        code: 'no-login-details',
        message: 'No login details were found for this request.',
      }
    };
  }

  let lastKnownUpdate: string|null;
  if (!request.query.login) {
    lastKnownUpdate = loginDetails.lastKnownUpdate;
  } else {
    const userDetails = await userModel.getLoginDetails(request.query.login);
    if (!userDetails) {
      return {
        statusCode: 400,
        error: {
          code: 'bad-login-request',
          message: 'User wasn\'t found in user model.',
        },
      };
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

  return {
    statusCode: 200,
    data: {
      lastKnownUpdate,
      version,
    },
  };
}

export function getRouter(): express.Router {
  const loginRouter = express.Router();
  loginRouter.get('/last-known.json', createAPIRoute(handleLastKnownUpdate));
  return loginRouter;
}
