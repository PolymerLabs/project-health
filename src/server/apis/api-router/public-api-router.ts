import * as express from 'express';

import {AbstractAPIRouter, PublicAPICallback} from './abstract-api-router';

export class PublicAPIRouter extends AbstractAPIRouter {
  protected async executeCallback<D>(
      callback: PublicAPICallback<D>,
      request: express.Request) {
    return callback(request);
  }
}
