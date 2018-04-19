import * as express from 'express';

import {GithubAppInstall, OrgSettings} from '../../types/api';
import {GenericStatusResponse} from '../../types/api';
import {githubAppModel} from '../models/githubAppModel';
import {settingsModel} from '../models/settingsModel';
import {UserRecord} from '../models/userModel';

import {APIResponse} from './api-router/abstract-api-router';
import {PrivateAPIRouter} from './api-router/private-api-router';
import * as responseHelper from './api-router/response-helper';

export async function handleDetailsRequest(request: express.Request):
    Promise<APIResponse> {
  const installId = request.body.installId;
  if (!installId) {
    return responseHelper.error(
        'no-install-id',
        'You must provide an \'installedId\' to use this API.');
  }

  if (typeof installId !== 'number') {
    return responseHelper.error(
        'install-id-not-a-number',
        `The 'installId' field must be a number, recevied ${
            typeof installId}.`);
  }

  const details = await githubAppModel.getInstallation(installId);
  if (!details) {
    return responseHelper.error(
        'no-install-found', 'The provided install could not be found.');
  }

  return responseHelper.data<GithubAppInstall>(details);
}

export async function handleGetConfigRequest(request: express.Request) {
  const orgName = request.body.orgName;
  if (!orgName) {
    return responseHelper.error(
        'no-org-name', 'You must provide an \'orgName\' to use this API.');
  }

  const details = await settingsModel.getOrgSettings(orgName);
  return responseHelper.data<OrgSettings|null>(details);
}

export async function handleSaveConfigRequest(
    request: express.Request, userRecord: UserRecord) {
  const orgName = request.body.orgName;
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
    await settingsModel.setOrgSettings(
        orgName, newSettings, userRecord.username);
  } catch (err) {
    return responseHelper.error('unable-to-save', err.message);
  }

  return responseHelper.data<GenericStatusResponse>({
    status: 'ok',
  });
}

export function getRouter(): express.Router {
  const appRouter = new PrivateAPIRouter();
  appRouter.post('/details', handleDetailsRequest, {
    requireBody: true,
  });
  appRouter.post('/get-config', handleGetConfigRequest, {
    requireBody: true,
  });
  appRouter.post('/save-config', handleSaveConfigRequest, {
    requireBody: true,
  });
  return appRouter.router;
}
