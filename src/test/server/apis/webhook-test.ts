import test from 'ava';
import * as fs from 'fs-extra';
import * as path from 'path';

import {startTestReplayServer} from '../../../replay-server';
import {handlePullRequestReview, handleStatus} from '../../../server/controllers/webhook-events';
import {initFirestore} from '../../../utils/firestore';
import {initGithub} from '../../../utils/github';
import {initSecrets} from '../../../utils/secrets';

const hookJsonDir = path.join(__dirname, '..', '..', 'static', 'webhook-data');

const TEST_SECRETS = {
  GITHUB_CLIENT_ID: 'ClientID',
  GITHUB_CLIENT_SECRET: 'ClientSecret',
  PUBLIC_VAPID_KEY:
      'BPtJjYprRvU3TOb0tw3FrVbLww3bp7ssGjX99PFlqIOb3b8uOH4_Q21GYhwsDRwcfToaFVVeOxWOq5XaXD1MGdw',
  PRIVATE_VAPID_KEY: 'o1P9aXm-QPZezF_8b7aQabivhv3QqaB0yg5zoFs6-qc',
};

test.before(() => {
  initFirestore();
  initSecrets(TEST_SECRETS);
});

test.beforeEach(async (t) => {
  const {server, url} = await startTestReplayServer(t);
  t.context.server = server;
  initGithub(url, url);
});

test.afterEach.cb((t) => {
  t.context.server.close(t.end);
});

test(
    'Webhook pull_request_review: submitted-state-changes_requested.json',
    async (t) => {
      const eventContent = await fs.readJSON(path.join(
          hookJsonDir,
          'pull_request_review',
          'submitted-state-changes_requested.json'));
      await handlePullRequestReview(eventContent);

      // TODO: Find way to assert arguments passed to sendNotification()

      t.pass();
    });

test(
    'Webhook pull_request_review: submitted-state-approved.json', async (t) => {
      const eventContent = await fs.readJSON(path.join(
          hookJsonDir, 'pull_request_review', 'submitted-state-approved.json'));
      await handlePullRequestReview(eventContent);

      // TODO: Find way to assert arguments passed to sendNotification()

      t.pass();
    });

// This is serial to ensure that the Github replay server is used before it's
// closed.
test.serial('Webhook status: error-travis.json', async (t) => {
  const eventContent =
      await fs.readJSON(path.join(hookJsonDir, 'status', 'error-travis.json'));
  await handleStatus(eventContent);

  // TODO: Find way to assert arguments passed to sendNotification()

  t.pass();
});

test('Webhook status: pending-travis.json', async (t) => {
  const eventContent = await fs.readJSON(
      path.join(hookJsonDir, 'status', 'pending-travis.json'));
  await handleStatus(eventContent);

  // TODO: Find way to assert arguments passed to sendNotification()

  t.pass();
});

test('Webhook status: success-travis.json', async (t) => {
  const eventContent = await fs.readJSON(
      path.join(hookJsonDir, 'status', 'success-travis.json'));
  await handleStatus(eventContent);

  // TODO: Find way to assert arguments passed to sendNotification()

  t.pass();
});

test('Webhook pull_request: review_requested.json', async (t) => {
  const eventContent = await fs.readJSON(
      path.join(hookJsonDir, 'pull_request', 'review_requested.json'));
  await handleStatus(eventContent);

  // TODO: Find way to assert arguments passed to sendNotification()

  t.pass();
});

test('Webhook pull_request: edited-open.json', async (t) => {
  const eventContent = await fs.readJSON(
      path.join(hookJsonDir, 'pull_request', 'edited-open.json'));
  await handleStatus(eventContent);

  // TODO: Find way to assert arguments passed to sendNotification()

  t.pass();
});