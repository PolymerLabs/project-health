
export type ApplicationSecrets = {
  GITHUB_CLIENT_ID: string; GITHUB_CLIENT_SECRET: string;
  PUBLIC_VAPID_KEY: string;
  PRIVATE_VAPID_KEY: string;
  APP: GitHubAppSecrets;
};

type GitHubAppSecrets = {
  GITHUB_APP_TO_GQL_TOKEN: string; GITHUB_APP_ID: number;
  GITHUB_APP_JWT_PATH: string;
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
  if (!secrets.APP && process.env.GAE_APPLICATION === 'github-health') {
    secrets.APP = (secrets as ApplicationSecrets & {
                    'APP_PROD': GitHubAppSecrets
                  }).APP_PROD;
  } else if (!secrets.APP) {
    secrets.APP = (secrets as ApplicationSecrets & {
                    'APP_STAGING': GitHubAppSecrets
                  }).APP_STAGING;
  }
  secretsSingleton = secrets;
}
