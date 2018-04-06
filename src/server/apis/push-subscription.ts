import * as bodyParser from 'body-parser';
import * as express from 'express';

import {getSubscriptionModel} from '../models/pushSubscriptionModel';
import {userModel} from '../models/userModel';

export function getRouter(): express.Router {
  const pushSubscriptionRouter = express.Router();
  pushSubscriptionRouter.post(
      '/:action',
      bodyParser.json(),
      async (request: express.Request, response: express.Response) => {
        try {
          if (!request.body) {
            response.status(400).send('No body.');
            return;
          }

          const userRecord = await userModel.getUserRecordFromRequest(request);
          if (!userRecord) {
            response.status(401).send('No login details.');
            return;
          }

          const pushSubscriptionModel = getSubscriptionModel();
          if (request.params.action === 'add') {
            pushSubscriptionModel.addPushSubscription(
                userRecord.username,
                request.body.subscription,
                request.body.supportedContentEncodings);
          } else if (request.params.action === 'remove') {
            pushSubscriptionModel.removePushSubscription(
                userRecord.username, request.body.subscription);
          } else {
            response.status(400).send(
                `Unknown action: ${request.params.action}`);
            return;
          }

          response.send();
        } catch (err) {
          console.error(err);
          response.status(500).send('An unhandled error occured.');
        }
      });

  return pushSubscriptionRouter;
}
