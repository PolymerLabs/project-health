import * as express from 'express';

import {secrets} from '../../utils/secrets';
import {REQUIRED_SCOPES, userModel} from '../models/userModel';

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
// This path must be used as the main redirect for our Github OAuth app.
const REQUIRED_REDIRECT_PATH = 'https://github-health.appspot.com/oauth.html';


function getGithubRedirectURL(req: express.Request): string|null {
  const host = req.headers['host'] || 'github-health.appspot.com';
  const protocol = host.indexOf('localhost') === -1 ? 'https://' : 'http://';
  const redirectOrigin = `${protocol}${host}/oauth.html`;

  const redirectParams: {[key: string]: string} = {};

  if (redirectOrigin !== REQUIRED_REDIRECT_PATH) {
    redirectParams['redirect-origin'] = redirectOrigin;
  }

  if (req.query['final-redirect']) {
    redirectParams['final-redirect'] = req.query['final-redirect'];
  }

  if (Object.keys(redirectParams).length) {
    return `${REQUIRED_REDIRECT_PATH}?${createSearchParams(redirectParams)}`;
  }
  return null;
}

function createSearchParams(properties: {[key: string]: string}) {
  const searchValues = Object.keys(properties).map((keyName) => {
    return `${keyName}=${properties[keyName]}`;
  });
  return searchValues.join('&');
}

async function getUserScopes(req: express.Request): Promise<string[]> {
  const scopeSet: Set<string> = new Set(REQUIRED_SCOPES);
  const login = await userModel.getUserRecordFromRequest(req);

  if (login && login.scopes) {
    login.scopes.forEach((scope) => scopeSet.add(scope));
  }

  if (req.query.scopes) {
    req.query.scopes.split(' ').forEach((scope: string) => scopeSet.add(scope));
  }

  return Array.from(scopeSet);
}

export async function performGitHubRedirect(
    req: express.Request, res: express.Response) {
  const scopes = await getUserScopes(req);

  const properties: {[key: string]: string} = {
    client_id: secrets().GITHUB_CLIENT_ID,
    scope: scopes.join(' '),
  };

  const redirectUri = getGithubRedirectURL(req);
  if (redirectUri) {
    properties['redirect_uri'] = encodeURIComponent(redirectUri);
  }

  const redirectUrl =
      `${GITHUB_AUTHORIZE_URL}?${createSearchParams(properties)}`;

  res.redirect(redirectUrl);
}
