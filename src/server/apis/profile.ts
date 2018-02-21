import * as express from 'express';

import {ProfileResponse} from '../../types/api';
import {userModel} from '../models/userModel';

function getProfileRouter(): express.Router {
  const profileRouter = express.Router();
  profileRouter.post(
      '/profile.json',
      async (request: express.Request, response: express.Response) => {
        const loginDetails = await userModel.getLoginFromRequest(request);
        if (!loginDetails) {
          response.status(400).send('No login details');
          return;
        }

        try {
          const profileResponse: ProfileResponse = {
            data: {
              username: loginDetails.username,
              fullname: loginDetails.fullname,
              avatarUrl: loginDetails.avatarUrl,
            }
          };
          response.send(JSON.stringify(profileResponse));
        } catch (err) {
          console.error(err);
          response.status(500).send({
            error: {
              code: 'unexpected-error',
              message: 'An unhandled error occured: ' + err.message
            },
          });
        }
      });

  return profileRouter;
}

export {getProfileRouter};
