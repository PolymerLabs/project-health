import * as express from 'express';

import {ID_COOKIE_NAME, userModel} from '../models/userModel';

export async function requireLogin(
    request: express.Request, response: express.Response, next: Function) {
  const loginDetails =
      await userModel.getLoginFromToken(request.cookies[ID_COOKIE_NAME]);
  if (loginDetails) {
    next();
    return;
  }

  if (request.method === 'GET') {
    response.redirect(
        302,
        `/oauth.html?final-redirect=${
            encodeURIComponent(request.originalUrl)}`);
  } else {
    response.status(401).send();
  }
}
