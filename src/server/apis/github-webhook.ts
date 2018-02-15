import * as express from 'express';

import * as webhookEvents from '../controllers/webhook-events';

function getRouter(): express.Router {
  const githubHookRouter = express.Router();
  githubHookRouter.post(
      '/', async (request: express.Request, response: express.Response) => {
        const eventName = request.headers['x-github-event'];
        if (!eventName) {
          response.status(400).send('No event type provided.');
          return;
        }

        try {
          let handled = false;

          // List of these events available here:
          // https://developer.github.com/webhooks/
          switch (eventName) {
            case 'ping':
              // Ping event is sent by Github whenever a new webhook is setup
              handled = true;
              break;
            case 'status':
              handled = await webhookEvents.handleStatus(request.body);
              break;
            case 'pull_request':
              handled = await webhookEvents.handlePullRequest(request.body);
              break;
            case 'pull_request_review':
              handled =
                  await webhookEvents.handlePullRequestReview(request.body);
              break;
            default:
              console.warn(`Unsupported event type received: ${eventName}`);
              handled = false;
              break;
          }

          response.status(handled ? 200 : 202).send();
        } catch (err) {
          console.error(err);
          response.status(500).send(err.message);
        }
      });
  return githubHookRouter;
}

export {getRouter};
