import * as express from 'express';

import {github} from '../../utils/github';
import * as webhookEvents from '../controllers/webhook-events';
import {userModel} from '../models/userModel';

export const WEBHOOK_URL = 'http://github-health.appspot.com/api/webhook';

function getRouter(): express.Router {
  const webhookRouter = express.Router();
  webhookRouter.post(
      '/', async (request: express.Request, response: express.Response) => {
        const eventName = request.headers['x-github-event'];
        if (!eventName) {
          response.status(400).send('No event type provided.');
          return;
        }

        try {
          // List of these events available here:
          // https://developer.github.com/webhooks/
          switch (eventName) {
            case 'ping':
              // Ping event is sent by Github whenever a new webhook is setup
              response.send();
              return;
            case 'status':
              await webhookEvents.handleStatus(request.body);
              response.send();
              return;
            case 'pull_request':
              await webhookEvents.handlePullRequest(request.body);
              response.send();
              return;
            case 'pull_request_review':
              await webhookEvents.handlePullRequestReview(request.body);
              response.send();
              return;
            default:
              console.warn(`Unsupported event type received: ${eventName}`);
              response.status(202).send('Unsupported event type.');
              return;
          }
        } catch (err) {
          console.error(err);
          response.status(500).send(err.message);
        }
      });

  webhookRouter.post(
      '/:action',
      async (request: express.Request, response: express.Response) => {
        const loginDetails =
            await userModel.getLoginFromRequest(request);
        if (!loginDetails) {
          response.sendStatus(400);
          return;
        }

        if (!request.body.org) {
          response.status(400).send('No org provided.');
          return;
        }

        if (request.params.action === 'add') {
          try {
            await github().post(
                `orgs/${request.body.org}/hooks`, loginDetails.token, {
                  name: 'web',
                  active: true,
                  events: [
                    '*',
                  ],
                  config: {url: WEBHOOK_URL, content_type: 'json'}
                });

            response.sendStatus(200);
            return;
          } catch (err) {
            if (err.statusCode === 422) {
              // The webhook already exists
              response.sendStatus(200);
              return;
            }

            console.warn('Unable to create webhook: ', err.message);
            response.sendStatus(500);
            return;
          }
        } else if (request.params.action === 'remove') {
          try {
            const org = request.body.org;
            const hooks =
                await github().get(`orgs/${org}/hooks`, loginDetails.token);
            let hookId = null;
            for (const hook of hooks) {
              if (hook.config.url === WEBHOOK_URL) {
                hookId = hook.id;
              }
            }

            if (!hookId) {
              response.status(400).send('No hook to remove.');
              return;
            }

            await github().delete(
                `orgs/${org}/hooks/${hookId}`,
                loginDetails.token,
            );

            response.sendStatus(200);
            return;
          } catch (err) {
            console.warn('Unable to remove webhook: ', err.message);
            response.sendStatus(500);
            return;
          }
        }

        response.sendStatus(400);
      });

  return webhookRouter;
}

export {getRouter};
