import * as express from 'express';

import {GenericStatusResponse} from '../../types/api';
import {getSubscriptionModel} from '../models/pushSubscriptionModel';
import {UserRecord} from '../models/userModel';

import {APIResponse} from './api-router/abstract-api-router';
import {PrivateAPIRouter} from './api-router/private-api-router';
import * as responseHelper from './api-router/response-helper';

export async function handlePushSubscriptionAction(
    request: express.Request,
    userRecord: UserRecord): Promise<APIResponse<GenericStatusResponse>> {
  const pushSubscriptionModel = getSubscriptionModel();
  if (request.params.action === 'add') {
    await pushSubscriptionModel.addPushSubscription(
        userRecord.username,
        request.body.subscription,
        request.body.supportedContentEncodings);
  } else if (request.params.action === 'remove') {
    await pushSubscriptionModel.removePushSubscription(
        userRecord.username, request.body.subscription);
  } else {
    return responseHelper.error(
        'unknown-action',
        `Received an unknown action: '${request.params.action}'`);
  }

  return responseHelper.data<GenericStatusResponse>({
    status: 'ok',
  });
}

export function getRouter(): express.Router {
  const pushSubscriptionRouter = new PrivateAPIRouter();
  pushSubscriptionRouter.post('/:action', handlePushSubscriptionAction, {
    requireBody: true,
  });
  return pushSubscriptionRouter.router;
}
