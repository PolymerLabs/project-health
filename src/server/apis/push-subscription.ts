import * as express from 'express';
import * as bodyParser from 'body-parser';

import {pushSubscriptionModel} from '../models/pushSubscriptionModel';
import {userModel} from '../models/userModel';

function getRouter(): express.Router {
  const pushSubscriptionRouter = express.Router();
  pushSubscriptionRouter.post('/:action', bodyParser.json(), async (request: express.Request, response: express.Response) => {
    try {
      if (!request.body) {
          response.sendStatus(400);
          return;
      }

      const loginDetails = await userModel.getLoginFromRequest(request);
      if (!loginDetails) {
          response.sendStatus(400);
          return;
      }

      if (request.params.action === 'add') {
        pushSubscriptionModel.addPushSubscription(
          loginDetails.username,
          request.body.subscription,
          request.body.supportedContentEncodings);
      } else if (request.params.action === 'remove') {
        pushSubscriptionModel.removePushSubscription(
          loginDetails.username,
          request.body.subscription);
      } else {
        response.sendStatus(400);
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

export {getRouter};
