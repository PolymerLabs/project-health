import * as express from 'express';
import * as webhookEvents from '../webhook-events';

function getRouter(): express.Router {
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

  return webhookRouter;
}

export {getRouter};