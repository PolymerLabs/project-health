export type ApplicationSecrets = {
  GITHUB_CLIENT_ID: string; GITHUB_CLIENT_SECRET: string;
  PUBLIC_VAPID_KEY: string;
  PRIVATE_VAPID_KEY: string;
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
  secretsSingleton = secrets;
}