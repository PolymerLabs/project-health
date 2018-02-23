import * as express from 'express';

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
          message: 'Unable to complete request for provided details',
        },
      };
    }

    lastKnownUpdate = userDetails.lastKnownUpdate;
  }

  return {
    statusCode: 200,
    data: {
      lastKnownUpdate,
    },
  };
}

function getRouter(): express.Router {
  const loginRouter = express.Router();
  loginRouter.get('/last-known.json', createAPIRoute(handleLastKnownUpdate));
  return loginRouter;
}

export {getRouter};
