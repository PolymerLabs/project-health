import * as express from 'express';
import * as webhookEvents from '../webhook-events';
import {userModel} from '../models/userModel';
import {GitHub} from '../../utils/github';

function getRouter(github: GitHub): express.Router {
  const webhookRouter = express.Router();
  webhookRouter.post('/', async (request: express.Request, response: express.Response) => {
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
          await webhookEvents.handleStatus(request, response);
          return;
        case 'pull_request':
          await webhookEvents.handlePullRequest(request, response);
          return;
        case 'pull_request_review':
          await webhookEvents.handlePullRequestReview(request, response);
          return;
        default:
          console.warn(`Unsupported event type received: ${eventName}`);
          response.status(202).send('Unsupported event type.');
          return;
      }
    } catch (err) {
      console.error(err);
      response.status(500).send('An unhandled error occured.');
    }
  });

  webhookRouter.post('/:action', async (request: express.Request, response: express.Response) => {
    const loginDetails = await userModel.getLoginFromRequest(request);
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
        const githubResponseBody = await github.post(
          `orgs/${request.body.org}/hooks`, 
          loginDetails.token,
          {
            name: 'web',
              active: true,
              events: [
                '*',
              ],
              config: {
                url: 'https://project-health-internal.googleplex.com/api/webhook',
                content_type: 'json'
              }
          });

        const webhookId = githubResponseBody.id;
        console.log(`Must add webhook '${webhookId}' to webhook ` +
          `model for '${request.body.org}`);

        response.sendStatus(200);
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
        // TODO: Retrieve webhook for org login
        const hookId = -1;
        const githubResponseBody = await github.post(
          `/orgs/${request.body.org}/hooks/${hookId}`,
          loginDetails.token,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `token ${loginDetails.token}`,
              'User-Agent': 'project-health',
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('Successfully removed webhook: ', githubResponseBody);

        response.sendStatus(200);
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
