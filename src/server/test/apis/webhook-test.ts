import test from 'ava';
import * as fs from 'fs-extra';
import * as path from 'path';

import {handlePullRequestReview} from '../../webhook-events';

const hookJsonDir = path.join(__dirname, '..', 'static', 'webhook-data');

const TEST_SECRETS = {
  GITHUB_CLIENT_ID: 'ClientID',
  GITHUB_CLIENT_SECRET: 'ClientSecret',
  PUBLIC_VAPID_KEY:
      'BPtJjYprRvU3TOb0tw3FrVbLww3bp7ssGjX99PFlqIOb3b8uOH4_Q21GYhwsDRwcfToaFVVeOxWOq5XaXD1MGdw',
  PRIVATE_VAPID_KEY: 'o1P9aXm-QPZezF_8b7aQabivhv3QqaB0yg5zoFs6-qc',
};

test.before(() => {
  // See https://cloud.google.com/docs/authentication/production
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const rootDir = path.join(__dirname, '..', '..', '..');
    for (const file of fs.readdirSync(rootDir)) {
      if (file.match(/^github-health-.*\.json$/)) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(rootDir, file);
        break;
      }
    }
  }
});


test(
    'Webhook pull_request_review: submitted-state-changes_requested.json',
    async (t) => {
      const eventContent = await fs.readJSON(path.join(
          hookJsonDir,
          'pull_request_review',
          'submitted-state-changes_requested.json'));
      await handlePullRequestReview(TEST_SECRETS, eventContent);

      // TODO: Find way to assert arguments passed to sendNotification()

      t.pass();
    });

test(
    'Webhook pull_request_review: submitted-state-approved.json', async (t) => {
      const eventContent = await fs.readJSON(path.join(
          hookJsonDir, 'pull_request_review', 'submitted-state-approved.json'));
      await handlePullRequestReview(TEST_SECRETS, eventContent);

      // TODO: Find way to assert arguments passed to sendNotification()

      t.pass();
    });
