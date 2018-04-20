import * as fse from 'fs-extra';
import * as jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

import {secrets} from '../../utils/secrets';

export async function generateGithubAppToken(installId: number):
    Promise<string> {
  const jwt = await generateJWT(
      secrets().GITHUB_APP_ID,
      secrets().GITHUB_APP_JWT_PATH,
  );

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
    console.error('Unabel to g');
    throw new Error('Unable to generate to GitHub App auth token.');
  }
  return responseBody.token;
}

async function generateJWT(appId: number, certPath: string) {
  const certContents = await fse.readFile(certPath);
  const payload = {
    // Issued at time
    iat: Math.floor(Date.now() / 1000),
    // JWT expiration time  (10 minute maximum)
    exp: Math.floor(Date.now() / 1000) + (10 * 60),
    // Integration's GitHub id
    iss: appId
  };

  // Sign with RSA SHA256
  return jwt.sign(payload, certContents, {algorithm: 'RS256'})
}
