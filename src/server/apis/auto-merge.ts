import * as bodyParser from 'body-parser';
import * as express from 'express';

import {pullRequestsModel} from '../models/pullRequestsModel';
import {userModel} from '../models/userModel';

function getRouter(): express.Router {
  const automergeRouter = express.Router();
  automergeRouter.post(
      '/set-merge-option/',
      bodyParser.json(),
      async (request: express.Request, response: express.Response) => {
        try {
          if (!request.body) {
            response.status(400).send('No body.');
            return;
          }

          const loginDetails = await userModel.getLoginFromRequest(request);
          if (!loginDetails) {
            response.status(400).send('No login details.');
            return;
          }

          const prId = request.body.prId;
          const automergeOption = request.body.automergeOption;
          if (!automergeOption) {
            response.status(400).send('No automergeOption.');
            return;
          }

          if (!prId) {
            response.status(400).send('No prId.');
            return;
          }

          await pullRequestsModel.setAutomergeOptions(prId, automergeOption);

          response.send();
        } catch (err) {
          console.error(err);
          response.status(500).send('An unhandled error occured.');
        }
      });

  return automergeRouter;
}

export {getRouter};
