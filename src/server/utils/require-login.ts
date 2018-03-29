import * as express from 'express';

import {userModel} from '../models/userModel';

export function requireLogin(withRedirect?: boolean) {
  return async (
             request: express.Request,
             response: express.Response,
             next: Function) => {
    const userRecord = await userModel.getUserRecordFromRequest(request);
    if (userRecord) {
      next();
      return;
    }

    if (withRedirect) {
      response.redirect(
          302,
          `/signin?final-redirect=${encodeURIComponent(request.originalUrl)}`);
    } else {
      response.status(401).send();
    }
  };
}
