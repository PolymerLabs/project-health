import * as express from 'express';

import {GenericStatusResponse} from '../../types/api';
import {userModel} from '../models/userModel';

import {createAPIRoute, ResponseDetails} from './api-route';

async function handleUpdateRequest(request: express.Request):
    Promise<ResponseDetails<GenericStatusResponse>> {
  const userRecord = await userModel.getUserRecordFromRequest(request);
  if (!userRecord) {
    return {
      statusCode: 400,
      error: {
        code: 'no-user-record',
        message: 'Please sign in',
      },
    };
  }

  if (!request.body || !request.body.id) {
    return {
      statusCode: 400,
      error: {
        code: 'no-body',
        message: 'The API expects a body with and "id" field.',
      },
    };
  }

  const issueId = request.body.id;
  await userModel.updateLastViewed(
      userRecord.username,
      issueId,
      Date.now(),
  );

  return {
    statusCode: 200,
    data: {
      status: 'ok',
    },
  };
}

export function getRouter(): express.Router {
  const loginRouter = express.Router();
  loginRouter.post('/update/', createAPIRoute(handleUpdateRequest));
  return loginRouter;
}
