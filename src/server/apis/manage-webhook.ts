import * as express from 'express';

import {github} from '../../utils/github';
import {userModel, UserRecord} from '../models/userModel';

const PROD_ORIGIN = 'github-health.appspot.com';
const STAGING_ORIGIN = 'github-health-staging.appspot.com';
const HOOK_PATH = '/api/webhook';

export function getHookUrl(request: express.Request) {
  let host = request.get('host');
  if (!host) {
    // If we have no host URL, use prod
    host = PROD_ORIGIN;
  } else if (host.indexOf('localhost') !== -1) {
    // If we are testing on localhost, use staging.
    host = STAGING_ORIGIN;
  } else if (host !== STAGING_ORIGIN && host !== PROD_ORIGIN) {
    throw new Error('Unexpected request host.');
  }

  return `https://${host}${HOOK_PATH}`;
}

async function addWebHook(
    userRecord: UserRecord,
    request: express.Request,
    response: express.Response) {
  try {
    const hookUrl = getHookUrl(request);
    await github().post(
        `orgs/${request.body.org}/hooks`, userRecord.githubToken, {
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
    userRecord: UserRecord,
    request: express.Request,
    response: express.Response) {
  try {
    const hookUrl = getHookUrl(request);

    const org = request.body.org;
    const hooks =
        await github().get(`orgs/${org}/hooks`, userRecord.githubToken);
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
        userRecord.githubToken,
    );

    response.sendStatus(200);
    return;
  } catch (err) {
    console.warn('Unable to remove webhook: ', err.message);
    response.sendStatus(500);
    return;
  }
}

export function getRouter(): express.Router {
  const webhookRouter = express.Router();
  webhookRouter.post(
      '/:action',
      async (request: express.Request, response: express.Response) => {
        const userRecord = await userModel.getUserRecordFromRequest(request);
        if (!userRecord) {
          response.sendStatus(401);
          return;
        }

        if (!request.body.org) {
          response.status(400).send('No org provided.');
          return;
        }

        if (request.params.action === 'add') {
          await addWebHook(userRecord, request, response);
        } else if (request.params.action === 'remove') {
          await removeWebHook(userRecord, request, response);
        } else {
          response.sendStatus(400);
        }
      });

  return webhookRouter;
}
