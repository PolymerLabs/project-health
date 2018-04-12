import * as express from 'express';

import {AbstractAPIRouter, PublicAPICallback} from './abstract-api-router';

export class PublicAPIRouter extends AbstractAPIRouter<PublicAPICallback> {
  protected async executeCallback(
      callback: PublicAPICallback,
      request: express.Request) {
    return callback(request);
  }
}
