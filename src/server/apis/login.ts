import * as express from 'express';
import fetch from 'node-fetch';

import {secrets} from '../../utils/secrets';
import {userModel} from '../models/userModel';

function getRouter(): express.Router {
  const loginRouter = express.Router();
  loginRouter.post(
      '/', async (request: express.Request, response: express.Response) => {
        if (!request.body) {
          response.sendStatus(400);
          return;
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
          console.log(loginResponseBody);
          response.sendStatus(500);
          return;
        }

        const accessToken = loginResponseBody['access_token'];
        const userScopes = loginResponseBody['scope'] ?
            loginResponseBody['scope'].split(',') :
            [];
        await userModel.addNewUser(accessToken, userScopes);

        response.cookie('id', accessToken, {httpOnly: true});
        response.end();
      });
  return loginRouter;
}

export {getRouter};