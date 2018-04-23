import * as express from 'express';

import {userModel} from '../../models/userModel';

import {AbstractAPIRouter, PrivateAPICallback} from './abstract-api-router';
import * as responseHelper from './response-helper';

export class PrivateAPIRouter extends AbstractAPIRouter {
  protected async executeCallback<D>(
      callback: PrivateAPICallback<D>,
      request: express.Request) {
    const userRecord = await userModel.getUserRecordFromRequest(request);
    if (!userRecord) {
      return responseHelper.error(
          'not-signed-in', 'You must be signed in to use this API.', {
            statusCode: 401,
          });
    }
    return callback(request, userRecord);
  }
}
