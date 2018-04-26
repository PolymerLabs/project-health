import * as express from 'express';
import * as JSON5 from 'json5';

import {OrgSettings} from '../../types/api';
import {GenericStatusResponse} from '../../types/api';
import {settings} from '../controllers/github-app-settings';
import {settingsModel} from '../models/settingsModel';
import {UserRecord} from '../models/userModel';

import {PrivateAPIRouter} from './api-router/private-api-router';
import * as responseHelper from './api-router/response-helper';

export async function handleGetConfigRequest(
    request: express.Request, userRecord: UserRecord) {
  const orgName = request.params.orgName;
  if (!orgName) {
    return responseHelper.error(
        'no-org-name', 'You must provide an \'orgName\' to use this API.');
  }

  const details = await settingsModel.getOrgSettings(orgName, userRecord);
  return responseHelper.data<OrgSettings|null>(details);
}

export async function handleSaveConfigRequest(
    request: express.Request, userRecord: UserRecord) {
  const orgName = request.params.orgName;
  const newSettings = request.body.settings;
  if (!orgName) {
    return responseHelper.error(
        'no-org-name',
        'This API requires the \'orgName\' field to be supplied.');
  }

  if (!newSettings) {
    return responseHelper.error(
        'no-settings',
        'This API requires the \'settings\' field to be a new configuration.');
  }

  if (typeof newSettings !== 'string') {
    return responseHelper.error(
        'settings-not-a-string',
        'This API expects the \'settings\' api to be a plain text string.');
  }

  try {
    await settingsModel.setOrgSettings(orgName, newSettings, userRecord);
  } catch (err) {
    return responseHelper.error('unable-to-save', err.message);
  }

  settings.onChange(orgName, JSON5.parse(newSettings));

  return responseHelper.data<GenericStatusResponse>({
    status: 'ok',
  });
}

export function getRouter(): express.Router {
  const appRouter = new PrivateAPIRouter();
  appRouter.get('/:orgName', handleGetConfigRequest);
  appRouter.post('/:orgName', handleSaveConfigRequest, {
    requireBody: true,
  });
  return appRouter.router;
}
