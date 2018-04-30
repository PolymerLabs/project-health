
export type ApplicationSecrets = {
  GITHUB_CLIENT_ID: string; GITHUB_CLIENT_SECRET: string;
  PUBLIC_VAPID_KEY: string;
  PRIVATE_VAPID_KEY: string;
  GITHUB_APP: GitHubAppSecrets;
};

type GitHubAppSecrets = {
  TO_GQL_TOKEN: string; ID: number; JWT_PATH: string;
};

let secretsSingleton: ApplicationSecrets|null = null;

export function secrets(): ApplicationSecrets {
  if (!secretsSingleton) {
    throw new Error('Secrets are not initialised.');
  }
  return secretsSingleton;
}

export function initSecrets(secrets: ApplicationSecrets) {
  if (secretsSingleton) {
    throw new Error('Secrets already initialised.');
  }
  if (!secrets.GITHUB_APP && process.env.GAE_APPLICATION === 'github-health') {
    secrets.GITHUB_APP = (secrets as ApplicationSecrets & {
                           'GITHUB_APP_PROD': GitHubAppSecrets
                         }).GITHUB_APP_PROD;
  } else if (!secrets.GITHUB_APP) {
    secrets.GITHUB_APP = (secrets as ApplicationSecrets & {
                           'GITHUB_APP_STAGING': GitHubAppSecrets
                         }).GITHUB_APP_STAGING;
  }
  secretsSingleton = secrets;
}
