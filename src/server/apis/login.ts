import * as express from 'express';
import fetch from 'node-fetch';

import {GenericStatusResponse} from '../../types/api';
import {secrets} from '../../utils/secrets';
import {ID_COOKIE_NAME, userModel} from '../models/userModel';

import {APIResponse} from './api-router/abstract-api-router';
import {PublicAPIRouter} from './api-router/public-api-router';
import * as responseHelper from './api-router/response-helper';

export async function handleLoginRequest(request: express.Request):
    Promise<APIResponse<GenericStatusResponse>> {
  const loginResponse =
      await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'client_id': secrets().GITHUB_CLIENT_ID,
          'client_secret': secrets().GITHUB_CLIENT_SECRET,
          'code': request.body,
        }),
      });

  const loginResponseBody = await loginResponse.json();
  if (loginResponseBody['error']) {
    const code = 'github-auth-failed';
    const msg = `Unable to authenticate with GitHub: ${
        JSON.stringify(loginResponseBody)}`;

    return responseHelper.error(code, msg, {statusCode: 401});
  }

  const accessToken = loginResponseBody['access_token'];
  const userScopes =
      loginResponseBody['scope'] ? loginResponseBody['scope'].split(',') : [];

  const newToken =
      await userModel.generateNewUserToken(accessToken, userScopes);
  const previousCookie = request.cookies[ID_COOKIE_NAME];
  if (previousCookie) {
    try {
      await userModel.deleteUserToken(previousCookie);
    } catch (err) {
      // It's ok if this fails, but want to make sure nothing fails.
      console.error('Unable to delete older user token: ', err.message);
    }
  }

  return responseHelper.data<GenericStatusResponse>(
      {
        status: 'ok',
      },
      {
        cookies: {
          [ID_COOKIE_NAME]: {
            value: newToken,
            options: {
              httpOnly: true,
            },
          },
        }
      });
}

export function getRouter(): express.Router {
  const loginRouter = new PublicAPIRouter();
  loginRouter.post('/', handleLoginRequest, {
    requireBody: true,
  });
  return loginRouter.router;
}
