import * as bodyParser from 'body-parser';
import * as express from 'express';

import {pullRequestsModel} from '../models/pullRequestsModel';
import {userModel} from '../models/userModel';

export function getRouter(): express.Router {
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

          const owner = request.body.owner;
          const repo = request.body.repo;
          const num = request.body.number;
          const automergeOption = request.body.automergeOption;
          if (!automergeOption) {
            response.status(400).send('No automergeOption.');
            return;
          }

          if (!owner) {
            response.status(400).send('No owner.');
            return;
          }

          if (!repo) {
            response.status(400).send('No repo.');
            return;
          }

          if (typeof num !== 'number') {
            response.status(400).send('Invalid number.');
            return;
          }

          await pullRequestsModel.setAutomergeOptions(
              owner, repo, num, automergeOption);

          response.send();
        } catch (err) {
          console.error(err);
          response.status(500).send('An unhandled error occured.');
        }
      });

  return automergeRouter;
}
