import * as express from 'express';
import fetch from 'node-fetch';

import {secrets} from '../../utils/secrets';
import {userModel} from '../models/userModel';

function getRouter(): express.Router {
  const loginRouter = express.Router();
  loginRouter.post(
      '/', async (request: express.Request, response: express.Response) => {
        if (!request.body) {
          response.status(400).send('No body');
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
          console.log('Unable to authenticate user with GitHub: ', loginResponseBody);
          response.status(500).send('Unable to authenticate');
          return;
        }

        
          const accessToken = loginResponseBody['access_token'];
          const userScopes = loginResponseBody['scope'] ?
              loginResponseBody['scope'].split(',') :
              [];
        
        try {
          await userModel.addNewUser(accessToken, userScopes);

          response.cookie('id', accessToken, {httpOnly: true});
          response.end();
        } catch (err) {
          console.error('Unable to login user with cookie: ', err);
          response.status(500).send('Unexpected login error.');
        }
      });
  return loginRouter;
}

export {getRouter};