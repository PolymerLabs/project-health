import * as fse from 'fs-extra';
import * as jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

import {secrets} from '../../utils/secrets';

export async function generateGithubAppToken(installId: number):
    Promise<string> {
  const jwt = await generateJWT();

  const response = await fetch(
      `https://api.github.com/installations/${installId}/access_tokens`, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.machine-man-preview+json',
          'Authorization': `Bearer ${jwt}`,
        },
      });
  const responseBody = await response.json();
  if (!responseBody.token) {
    console.error(`Generating GitHub app token failed with response: [${
        response.status}] ${response.statusText} ${
        JSON.stringify(responseBody)}`);
    throw new Error('Unable to generate to GitHub App auth token.');
  }
  return responseBody.token;
}

/**
 * Generate a JSON Web Token to send to GitHub.
 * JWT's are used as a Bearer token to identify the app itself to GitHub
 * and act on behalf of the app (instead of acting on behalf of an
 * installation).
 */
export async function generateJWT() {
  const appId = secrets().GITHUB_APP.ID;
  const certPath = secrets().GITHUB_APP.JWT_PATH;

  const certContents = await fse.readFile(certPath);
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    // Issued at time
    iat: now,
    // JWT expiration time  (10 minute maximum)
    exp: now + (10 * 60),
    // Integration's GitHub id
    iss: appId
  };

  // Sign with RSA SHA256
  return jwt.sign(payload, certContents, {algorithm: 'RS256'});
}
