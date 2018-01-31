import * as express from 'express';
import fetch from 'node-fetch';
import * as webhookEvents from '../webhook-events';
import {getLoginFromRequest} from '../utils/login-from-request';
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
    const loginDetails = await getLoginFromRequest(github, request);
    if (!loginDetails) {
        response.sendStatus(400);
        return;
    }

    if (!request.body.org) {
      response.status(400).send('No org provided.');
      return;
    }

    if (request.params.action === 'add') {
      const githubAPIResponse = await fetch(
        `https://api.github.com/orgs/${request.body.org}/hooks`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${loginDetails.token}`,
            'User-Agent': 'project-health',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'web',
            active: true,
            events: [
              '*',
            ],
            config: {
              url: 'https://project-health-internal.googleplex.com/api/webhook',
              content_type: 'json'
            }
          }),
        }
      );

      const githubResponseBody: {id: string} = await githubAPIResponse.json();

      if (!githubAPIResponse.ok) {
        console.warn('Unable to create webhook: ', githubResponseBody);
        response.sendStatus(githubAPIResponse.status);
        return;
      }

      const webhookId = githubResponseBody.id;
      console.log(`Must add webhook '${webhookId}' to webhook ` +
        `model for '${request.body.org}`);

      response.sendStatus(200);
    } else if (request.params.action === 'remove') {
      // TODO: Retrieve webhook for org login
      const hookId = -1;
      const githubAPIResponse = await fetch(
        `https://api.github.com/orgs/${request.body.org}/hooks/${hookId}`,
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

      const githubResponseBody = await githubAPIResponse.json();

      if (!githubAPIResponse.ok) {
        console.warn('Unable to remove webhook: ', githubResponseBody);
        response.sendStatus(githubAPIResponse.status);
        return;
      }

      response.sendStatus(200);
    }

    response.sendStatus(400);
  });

  return webhookRouter;
}

export {getRouter};
