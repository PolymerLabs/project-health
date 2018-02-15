import * as express from 'express';

import {github} from '../../utils/github';
import {LoginDetails, userModel} from '../models/userModel';

const PROD_ORIGIN = 'https://github-health.appspot.com';
const STAGING_ORIGIN = 'https://github-health-staging.appspot.com';
const HOOK_PATH = '/api/webhook';

export function getHookUrl(request: express.Request) {
  let host = request.get('host');
  if (!host) {
    // If we have no host URL, use prod
    host = PROD_ORIGIN;
  }

  if (host.indexOf('localhost') !== -1) {
    // If we are testing on localhost, use staging.
    host = STAGING_ORIGIN;
  }

  return host + HOOK_PATH;
}

async function addWebHook(
    loginDetails: LoginDetails,
    request: express.Request,
    response: express.Response) {
  try {
    const hookUrl = getHookUrl(request);

    await github().post(
        `orgs/${request.body.org}/hooks`, loginDetails.githubToken, {
          name: 'web',
          active: true,
          events: [
            '*',
          ],
          config: {url: hookUrl, content_type: 'json'}
        });

    response.sendStatus(200);
  } catch (err) {
    if (err.statusCode === 422) {
      // The webhook already exists
      response.sendStatus(200);
      return;
    }

    console.warn('Unable to create webhook: ', err.message);
    response.sendStatus(500);
  }
}

async function removeWebHook(
    loginDetails: LoginDetails,
    request: express.Request,
    response: express.Response) {
  try {
    const hookUrl = getHookUrl(request);

    const org = request.body.org;
    const hooks =
        await github().get(`orgs/${org}/hooks`, loginDetails.githubToken);
    let hookId = null;
    for (const hook of hooks) {
      if (hook.config.url === hookUrl) {
        hookId = hook.id;
      }
    }

    if (!hookId) {
      response.status(400).send('No hook to remove.');
      return;
    }

    await github().delete(
        `orgs/${org}/hooks/${hookId}`,
        loginDetails.githubToken,
    );

    response.sendStatus(200);
    return;
  } catch (err) {
    console.warn('Unable to remove webhook: ', err.message);
    response.sendStatus(500);
    return;
  }
}

function getRouter(): express.Router {
  const webhookRouter = express.Router();
  webhookRouter.post(
      '/:action',
      async (request: express.Request, response: express.Response) => {
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
          await addWebHook(loginDetails, request, response);
        } else if (request.params.action === 'remove') {
          await removeWebHook(loginDetails, request, response);
        } else {
          response.sendStatus(400);
        }
      });

  return webhookRouter;
}

export {getRouter};
