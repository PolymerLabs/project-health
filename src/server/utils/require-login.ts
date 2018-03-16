import * as express from 'express';

import {userModel} from '../models/userModel';

export async function requireLogin(
    request: express.Request, response: express.Response, next: Function) {
  const loginDetails = await userModel.getLoginFromRequest(request);
  if (loginDetails) {
    next();
    return;
  }

  if (request.method === 'GET') {
    response.redirect(
        302,
        `/signin?final-redirect=${encodeURIComponent(request.originalUrl)}`);
  } else {
    response.status(401).send();
  }
}
