import * as express from 'express';
import * as bodyParser from 'body-parser';

import {GitHub} from '../../utils/github';
import {PushSubscriptionModel} from '../models/PushSubscriptionModel';
import { getLoginFromRequest } from '../utils/login-from-request';

function getRouter(github: GitHub): express.Router {
  const pushSubscriptions = new PushSubscriptionModel();
  
  const pushSubscriptionRouter = express.Router();
  pushSubscriptionRouter.post('/:action', bodyParser.json(), async (request: express.Request, response: express.Response) => {
    try {
      if (!request.body) {
          response.sendStatus(400);
          return;
      }

      const loginDetails = await getLoginFromRequest(github, request);
      if (!loginDetails) {
          response.sendStatus(400);
          return;
      }

      if (request.params.action === 'add') {
        pushSubscriptions.addPushSubscription(
          loginDetails.username,
          request.body.subscription,
          request.body.supportedContentEncodings);
      } else if (request.params.action === 'remove') {
        pushSubscriptions.removePushSubscription(
          loginDetails.username,
          request.body.subscription);
      } else {
        response.sendStatus(400);
        return;
      }

      response.send();
    } catch (err) {
      console.error(err);
      response.status(500).send(`An unhandled error occured.`);
    }
  });

  return pushSubscriptionRouter;
}

export {getRouter};