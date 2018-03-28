import anyTest, {TestInterface} from 'ava';
import * as fs from 'fs-extra';
import {Server} from 'http';
import * as path from 'path';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {startTestReplayServer} from '../../../replay-server';
import * as notificationController from '../../../server/controllers/notifications';
import {handlePullRequest} from '../../../server/controllers/webhook-events/pull-request';
import {handlePullRequestReview} from '../../../server/controllers/webhook-events/pull-request-review';
import {pullRequestsModel} from '../../../server/models/pullRequestsModel';
import {userModel} from '../../../server/models/userModel';
import * as getPRIDModule from '../../../server/utils/get-gql-pr-id';
import * as getPRFromCommitModule from '../../../server/utils/get-pr-from-commit';
import {PullRequestDetails} from '../../../server/utils/get-pr-from-commit';
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

const PR_DETAILS: PullRequestDetails = {
  gqlId: 'test-pr-id',
  number: 1,
  title: 'test-title',
  body: 'test-body',
  url: 'http://test-url.com',
  owner: 'test-owner',
  repo: 'test-repo',
  author: 'test-pr-author',
  state: 'OPEN',
  commit: {
    oid: 'test-commit-SHA',
    state: 'PENDING',
  }
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

test.serial(
    'Webhook pull_request_review: submitted-state-changes_requested.json',
    async (t) => {
      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');

      t.context.sandbox.stub(userModel, 'getLoginDetails').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRIDModule, 'getPRID').callsFake(() => {
        return 'injected-pr-id';
      });

      const eventContent = await fs.readJSON(path.join(
          hookJsonDir,
          'pull_request_review',
          'submitted-state-changes_requested.json'));
      const response = await handlePullRequestReview(eventContent);
      t.deepEqual(response.handled, true);

      t.deepEqual(sendStub.callCount, 1);
      t.deepEqual(sendStub.args[0], [
        'samuelli',
        {
          title: 'gauntface requested changes',
          body: '[project-health] Add favicon',
          requireInteraction: true,
          tag: 'pr-PolymerLabs/project-health/112',
          data: {
            pullRequest: {
              gqlId: 'injected-pr-id',
            },
            url: 'https://github.com/PolymerLabs/project-health/pull/112'
          }
        }
      ]);
    });

test.serial(
    'Webhook pull_request_review: submitted-state-approved.json', async (t) => {
      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');

      t.context.sandbox.stub(userModel, 'getLoginDetails').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            const detailsClone = Object.assign({}, PR_DETAILS);
            detailsClone.commit.state = 'SUCCESS';
            return detailsClone;
          });

      t.context.sandbox.stub(getPRIDModule, 'getPRID').callsFake(() => {
        return 'injected-pr-id';
      });

      const eventContent = await fs.readJSON(path.join(
          hookJsonDir, 'pull_request_review', 'submitted-state-approved.json'));
      const response = await handlePullRequestReview(eventContent);
      t.deepEqual(response.handled, true);

      t.deepEqual(sendStub.callCount, 1);
      t.deepEqual(sendStub.args[0], [
        'gauntface',
        {
          title: 'gauntface approved your PR and it\'s ready to merge',
          body: '[project-health] Add favicon',
          requireInteraction: true,
          tag: 'pr-PolymerLabs/project-health/112',
          data: {
            pullRequest: {
              gqlId: 'injected-pr-id',
            },
            url: 'https://github.com/PolymerLabs/project-health/pull/112'
          }
        }
      ]);
    });

test.serial(
    'Webhook pull_request_review: submitted-state-commented.json',
    async (t) => {
      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');

      t.context.sandbox.stub(userModel, 'getLoginDetails').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRIDModule, 'getPRID').callsFake(() => {
        return 'injected-pr-id';
      });

      const eventContent = await fs.readJSON(path.join(
          hookJsonDir,
          'pull_request_review',
          'submitted-state-commented.json'));
      const response = await handlePullRequestReview(eventContent);
      t.deepEqual(response.handled, true);

      t.deepEqual(sendStub.callCount, 1);
      t.deepEqual(sendStub.args[0], [
        'gauntface',
        {
          title: 'aomarks commented on your PR',
          body:
              '[project-health] Demonstrate end-to-end firestore integration.',
          requireInteraction: true,
          tag: 'pr-PolymerLabs/project-health/65',
          data: {
            pullRequest: {
              gqlId: 'injected-pr-id',
            },
            url: 'https://github.com/PolymerLabs/project-health/pull/65',
          }
        }
      ]);
    });

test.serial(
    'Webhook pull_request_review: submitted-state-self-commented.json',
    async (t) => {
      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');

      t.context.sandbox.stub(userModel, 'getLoginDetails').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRIDModule, 'getPRID').callsFake(() => {
        return 'injected-pr-id';
      });

      const eventContent = await fs.readJSON(path.join(
          hookJsonDir,
          'pull_request_review',
          'submitted-state-self-commented.json'));
      const response = await handlePullRequestReview(eventContent);
      t.deepEqual(response.handled, true);

      t.deepEqual(sendStub.callCount, 0);
    });

test.serial('Webhook pull_request_review: unknown action', async (t) => {
  const sendStub =
      t.context.sandbox.stub(notificationController, 'sendNotification');

  const response = await handlePullRequestReview({
    action: 'unknown',
    review: {
      state: 'approved',
      user: {
        login: 'login',
      },
      commit_id: '123',
    },
    pull_request: {
      number: 1,
      title: '',
      user: {
        login: '',
      },
      html_url: '',
    },
    repository: {
      name: 'test-repo',
      owner: {
        login: 'test-owner',
      },
      full_name: 'test-owner/test-repo',
    },
  });
  t.deepEqual(response.handled, false);
  t.deepEqual(sendStub.callCount, 0);
});

test.serial('Webhook pull_request_review: unknown review state', async (t) => {
  const sendStub =
      t.context.sandbox.stub(notificationController, 'sendNotification');

  t.context.sandbox.stub(userModel, 'getLoginDetails').callsFake(() => {
    return FAKE_LOGIN_DETAILS;
  });

  t.context.sandbox.stub(getPRIDModule, 'getPRID').callsFake(() => {
    return 'injected-pr-id';
  });

  const response = await handlePullRequestReview({
    action: 'submitted',
    review: {
      state: 'unknown',
      user: {
        login: 'login',
      },
      commit_id: '123',
    },
    pull_request: {
      number: 1,
      title: '',
      user: {
        login: 'example-pr-login',
      },
      html_url: '',
    },
    repository: {
      name: 'test-repo',
      owner: {
        login: 'test-owner',
      },
      full_name: 'test-owner/test-repo',
    },
  });
  t.deepEqual(response.handled, true);
  t.deepEqual(sendStub.callCount, 0);
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
