import * as express from 'express';
import fetch from 'node-fetch';

import {LoginResponse} from '../../types/api';
import {secrets} from '../../utils/secrets';
import {ID_COOKIE_NAME, userModel} from '../models/userModel';

import {createAPIRoute, ResponseDetails} from './api-route';

async function handleLoginRequest(request: express.Request):
    Promise<ResponseDetails<LoginResponse>> {
  if (!request.body) {
    return {
      statusCode: 400,
      error: {
        code: 'no-body',
        message: 'The login API expects a body string.',
      },
    };
  }

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
    return {
      statusCode: 500,
      error: {
        code: 'github-auth-failed',
        message: `Unable to authenticate with GitHub: ${
            JSON.stringify(loginResponseBody)}`,
      }
    };
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

  return {
    statusCode: 200,
    cookies: {
      [ID_COOKIE_NAME]: {
        value: newToken,
        options: {
          httpOnly: true,
        },
      },
    },
    data: {
      status: 'ok',
    },
  };
}

function getRouter(): express.Router {
  const loginRouter = express.Router();
  loginRouter.post('/', createAPIRoute(handleLoginRequest));
  return loginRouter;
}

export {getRouter};
