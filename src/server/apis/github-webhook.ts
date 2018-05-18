import * as express from 'express';

import {webhooksController} from '../controllers/github-app-webhooks';
import {hooksModel} from '../models/hooksModel';

export function getRouter(): express.Router {
  const githubHookRouter = express.Router();
  githubHookRouter.post(
      '/', async (request: express.Request, response: express.Response) => {
        const eventName = request.headers['x-github-event'];
        if (!eventName) {
          response.status(400).send('No event type provided.');
          return;
        }

        if (eventName === 'ping') {
          // Ping event is sent by Github whenever a new webhook is setup
          response.send();
          return;
        }

        try {
          if (process.env.NODE_ENV === 'production') {
            const eventDelivery = request.headers['x-github-delivery'];
            if (!eventDelivery) {
              response.status(400).send('No event delivery provided.');
              return;
            }

            if (typeof eventDelivery !== 'string') {
              response.status(400).send('Event delivery was not a string.');
              return;
            }

            const loggedHook = await hooksModel.logHook(eventDelivery);
            if (!loggedHook) {
              response.status(202).send('Duplicate Event');
              return;
            }
          }

          const payload = request.body;
          // Inject the payload type into the payload itself. This allows
          // handlers to check the type and for typescript to type differentiate
          // based on its value.
          payload.type = eventName;

          // Send the payload to the webhooks controller, which sends the
          // payload to all subscribed handlers.
          const results = await webhooksController.handleWebhookEvent(payload);
          if (!results.length) {
            response.sendStatus(202);
          } else {
            response.status(200);
            response.json(results);
          }
        } catch (err) {
          console.error('Error while handled GitHub web hook: ', err);
          response.status(500).send(err.message);
        }

        await hooksModel.cleanHooks();
      });
  return githubHookRouter;
}
