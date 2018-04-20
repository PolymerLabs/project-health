import {ApplicationSecrets} from '../../utils/secrets';

export function newFakeSecrets(): ApplicationSecrets {
  const fakeSecrets: ApplicationSecrets = {
    GITHUB_CLIENT_ID: 'ClientID',
    GITHUB_CLIENT_SECRET: 'ClientSecret',
    PUBLIC_VAPID_KEY:
        'BPtJjYprRvU3TOb0tw3FrVbLww3bp7ssGjX99PFlqIOb3b8uOH4_Q21GYhwsDRwcfToaFVVeOxWOq5XaXD1MGdw',
    PRIVATE_VAPID_KEY: 'o1P9aXm-QPZezF_8b7aQabivhv3QqaB0yg5zoFs6-qc',

    GITHUB_APP_TO_GQL_TOKEN: 'GitHubAppToGQLToken',
    GITHUB_APP_ID: 0,
    GITHUB_APP_JWT_PATH: '',
  };
  return Object.assign({}, fakeSecrets);
}
