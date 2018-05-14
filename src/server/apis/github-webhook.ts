import * as express from 'express';

import {webhooksController} from '../controllers/github-app-webhooks';
import {NotificationsSent} from '../controllers/notifications';
import {handleGithubAppInstall} from '../controllers/webhook-events/github-app-install';
import {handlePullRequest} from '../controllers/webhook-events/pull-request';
import {handleStatus} from '../controllers/webhook-events/status';
import {hooksModel} from '../models/hooksModel';

export interface WebHookHandleResponse {
  handled: boolean;
  notifications: NotificationsSent|null;
  message: string|null;
}

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

          // TODO: migrate these to the new subscriber model.
          let handled: WebHookHandleResponse|null = null;
          // List of these events available here:
          // https://developer.github.com/webhooks/
          switch (eventName) {
            case 'status':
              handled = await handleStatus(request.body);
              break;
            case 'pull_request':
              handled = await handlePullRequest(request.body);
              break;
            case 'installation':
              handled = await handleGithubAppInstall(request.body);
            default:
              break;
          }

          if (handled) {
            response.status(handled ? 200 : 202);
            response.json(handled);
          } else {
            const payload = request.body;
            payload.type = eventName;
            const results =
                await webhooksController.handleWebhookEvent(payload);
            if (!results.length) {
              response.sendStatus(202);
            } else {
              response.status(200);
              response.json(results);
            }
          }
        } catch (err) {
          console.error('Error while handled GitHub web hook: ', err);
          response.status(500).send(err.message);
        }

        await hooksModel.cleanHooks();
      });
  return githubHookRouter;
}
