import anyTest, {TestInterface} from 'ava';
import * as fs from 'fs-extra';
import {Server} from 'http';
import * as path from 'path';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {startTestReplayServer} from '../../../replay-server';
import * as notificationController from '../../../server/controllers/notifications';
import {handlePullRequest} from '../../../server/controllers/webhook-events/pull-request';
import {pullRequestsModel} from '../../../server/models/pullRequestsModel';
import {userModel} from '../../../server/models/userModel';
import * as getPRIDModule from '../../../server/utils/get-gql-pr-id';
import {initFirestore} from '../../../utils/firestore';
import {initGithub} from '../../../utils/github';
import {initSecrets} from '../../../utils/secrets';

const hookJsonDir = path.join(__dirname, '..', '..', 'static', 'webhook-data');

const FAKE_LOGIN_DETAILS = {
  githubToken: 'injected-fake-token',
  username: 'test-username',
  scopes: null,
};

const TEST_SECRETS = {
  GITHUB_CLIENT_ID: 'ClientID',
  GITHUB_CLIENT_SECRET: 'ClientSecret',
  PUBLIC_VAPID_KEY:
      'BPtJjYprRvU3TOb0tw3FrVbLww3bp7ssGjX99PFlqIOb3b8uOH4_Q21GYhwsDRwcfToaFVVeOxWOq5XaXD1MGdw',
  PRIVATE_VAPID_KEY: 'o1P9aXm-QPZezF_8b7aQabivhv3QqaB0yg5zoFs6-qc',
};

const TEST_PR_OWNER = 'test-owner';
const TEST_PR_REPO = 'test-repo';
const TEST_PR_NUMBER = -2;

type TestContext = {
  server: Server,
  sandbox: SinonSandbox
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
  initSecrets(TEST_SECRETS);
});

test.beforeEach(async (t) => {
  const {server, url} = await startTestReplayServer(t);
  t.context.server = server;
  t.context.sandbox = sinon.sandbox.create();
  initGithub(url, url);

  await pullRequestsModel.deletePR(TEST_PR_OWNER, TEST_PR_REPO, TEST_PR_NUMBER);
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
  await new Promise((resolve) => t.context.server.close(resolve));
  await pullRequestsModel.deletePR(TEST_PR_OWNER, TEST_PR_REPO, TEST_PR_NUMBER);
});

test.serial('Webhook pull_request: review_requested.json', async (t) => {
  const sendStub =
      t.context.sandbox.stub(notificationController, 'sendNotification');

  t.context.sandbox.stub(userModel, 'getLoginDetails').callsFake(() => {
    return FAKE_LOGIN_DETAILS;
  });

  t.context.sandbox.stub(getPRIDModule, 'getPRID').callsFake(() => {
    return 'injected-pr-id';
  });

  const eventContent = await fs.readJSON(
      path.join(hookJsonDir, 'pull_request', 'review_requested.json'));
  const response = await handlePullRequest(eventContent);
  t.deepEqual(response.handled, true, 'should be handled');
  t.deepEqual(sendStub.callCount, 1);
  t.deepEqual(sendStub.args[0], [
    'samuelli',
    {
      title: 'gauntface requested a review',
      body: '[project-health] Add icon to notification and correcting URL link',
      requireInteraction: true,
      tag: 'pr-PolymerLabs/project-health/146',
      data: {
        pullRequest: {
          gqlId: 'injected-pr-id',
        },
        url: 'https://github.com/PolymerLabs/project-health/pull/146',
      }
    }
  ]);
});

test.serial('Webhook pull_request: edited-open.json', async (t) => {
  const sendStub =
      t.context.sandbox.stub(notificationController, 'sendNotification');

  const eventContent = await fs.readJSON(
      path.join(hookJsonDir, 'pull_request', 'edited-open.json'));
  const response = await handlePullRequest(eventContent);

  t.deepEqual(response.handled, false);
  t.deepEqual(sendStub.callCount, 0);
});
