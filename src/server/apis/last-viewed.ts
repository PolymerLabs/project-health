import * as express from 'express';

import {userModel, UserRecord} from '../models/userModel';

import {APIResponse} from './api-router/abstract-api-router';
import {PrivateAPIRouter} from './api-router/private-api-router';
import * as responseHelper from './api-router/response-helper';

async function handleUpdateRequest(
    request: express.Request, userRecord: UserRecord): Promise<APIResponse> {
  const issueId = request.body.id;
  await userModel.updateLastViewed(
      userRecord.username,
      issueId,
      Date.now(),
  );

  return responseHelper.data({
    status: 'ok',
  });
}

export function getRouter(): express.Router {
  const lastViewedRouter = new PrivateAPIRouter();
  lastViewedRouter.post('/update/', handleUpdateRequest, {
    requireBody: true,
  });
  return lastViewedRouter.router;
}
