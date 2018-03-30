import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';
import * as sinon from 'sinon';
import {SinonSandbox, SinonStub} from 'sinon';

import {startTestReplayServer} from '../../../../replay-server';
import * as notificationController from '../../../../server/controllers/notifications';
import {handleStatus} from '../../../../server/controllers/webhook-events/status';
import {StatusHook} from '../../../../server/controllers/webhook-events/types';
import {pullRequestsModel} from '../../../../server/models/pullRequestsModel';
import {userModel} from '../../../../server/models/userModel';
import * as getPRFromCommitModule from '../../../../server/utils/get-pr-from-commit';
import {PullRequestDetails} from '../../../../server/utils/get-pr-from-commit';
import * as performAutomergeModule from '../../../../server/utils/perform-automerge';
import {initFirestore} from '../../../../utils/firestore';
import {initGithub} from '../../../../utils/github';
import {initSecrets} from '../../../../utils/secrets';

const TEST_SECRETS = {
  GITHUB_CLIENT_ID: 'ClientID',
  GITHUB_CLIENT_SECRET: 'ClientSecret',
  PUBLIC_VAPID_KEY:
      'BPtJjYprRvU3TOb0tw3FrVbLww3bp7ssGjX99PFlqIOb3b8uOH4_Q21GYhwsDRwcfToaFVVeOxWOq5XaXD1MGdw',
  PRIVATE_VAPID_KEY: 'o1P9aXm-QPZezF_8b7aQabivhv3QqaB0yg5zoFs6-qc',
};

const FAKE_LOGIN_DETAILS = {
  githubToken: 'injected-fake-token',
  username: 'test-username',
  scopes: null,
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

const SUCCESS_HOOK: StatusHook = {
  sha: 'test-commit-SHA',
  name: 'project-health/status-test',
  state: 'success',
  description: '',
  repository: {
    name: 'status-test',
    owner: {
      login: 'status-owner-login',
    },
    full_name: 'status-owner-login/status-test',
  },
  commit: {
    author: {
      login: 'status-commit-author',
    },
  },
};
const ERROR_HOOK: StatusHook = {
  sha: 'test-commit-SHA',
  name: 'project-health/status-test',
  state: 'error',
  description: 'test-description',
  repository: {
    name: 'status-test',
    owner: {
      login: 'status-owner-login',
    },
    full_name: 'status-owner-login/status-test',
  },
  commit: {
    author: {
      login: 'status-commit-author',
    },
  },
};

const PENDING_HOOK: StatusHook = {
  sha: 'test-commit-SHA',
  name: 'project-health/status-test',
  state: 'pending',
  description: '',
  repository: {
    name: 'status-test',
    owner: {
      login: 'status-owner-login',
    },
    full_name: 'status-owner-login/status-test',
  },
  commit: {
    author: {
      login: 'status-commit-author',
    },
  },
};

function newFakePRDetails(extraDetails: {}) {
  return Object.assign({}, PR_DETAILS, extraDetails);
}

type TestContext = {
  server: Server,
  sandbox: SinonSandbox
};
const test = anyTest as TestInterface<TestContext>;

let sendStub: SinonStub;
let performAutomergeStub: SinonStub;

test.before(() => {
  initFirestore();
  initSecrets(TEST_SECRETS);
});

test.beforeEach(async (t) => {
  const {server, url} = await startTestReplayServer(t);
  t.context.server = server;
  t.context.sandbox = sinon.sandbox.create();
  initGithub(url, url);

  sendStub = t.context.sandbox.stub(notificationController, 'sendNotification');
  performAutomergeStub =
      t.context.sandbox.stub(performAutomergeModule, 'performAutomerge');
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
  await new Promise((resolve) => t.context.server.close(resolve));
});

test.serial(
    '[handleStatus]: should not handle success hook if no login details',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return null;
      });

      const response = await handleStatus(SUCCESS_HOOK);
      t.deepEqual(response.handled, false, 'webhook should not be handled.');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handleStatus]: should not handle error hook if no login details',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        // Return no details to act as no token
        return null;
      });

      const response = await handleStatus(ERROR_HOOK);
      t.deepEqual(response.handled, false, 'webhook should not be handled.');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handleStatus]: should not handle success hook if no PR Details',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      const getPRDetailsStub =
          t.context.sandbox
              .stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
              .callsFake(() => {
                return null;
              });

      const response = await handleStatus(SUCCESS_HOOK);
      t.deepEqual(response.handled, false, 'webhook should not be handled.');
      t.deepEqual(
          getPRDetailsStub.callCount,
          1,
          'getPRDetailsFromCommit should be called once.');
      t.deepEqual(getPRDetailsStub.args[0][0], 'injected-fake-token');
      t.deepEqual(getPRDetailsStub.args[0][1], 'project-health/status-test');
      t.deepEqual(getPRDetailsStub.args[0][2], 'test-commit-SHA');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handleStatus]: should not handle error hook if no PR Details',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      const getPRDetailsStub =
          t.context.sandbox
              .stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
              .callsFake(() => {
                return null;
              });

      const response = await handleStatus(ERROR_HOOK);
      t.deepEqual(response.handled, false, 'webhook should not be handled.');
      t.deepEqual(
          getPRDetailsStub.callCount,
          1,
          'getPRDetailsFromCommit should be called once.');
      t.deepEqual(getPRDetailsStub.args[0][0], 'injected-fake-token');
      t.deepEqual(getPRDetailsStub.args[0][1], 'project-health/status-test');
      t.deepEqual(getPRDetailsStub.args[0][2], 'test-commit-SHA');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handleStatus]: should not handle success hook if PR is not open',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return newFakePRDetails({
              state: 'CLOSED',
            });
          });

      const response = await handleStatus(SUCCESS_HOOK);
      t.deepEqual(response.handled, false, 'webhook should not be handled.');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handleStatus]: should not handle error hook if PR is not open',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return newFakePRDetails({
              state: 'CLOSED',
            });
          });

      const response = await handleStatus(ERROR_HOOK);
      t.deepEqual(response.handled, false, 'webhook should not be handled.');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handleStatus]: should not handle success hook if the commit SHA is not the latest',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return newFakePRDetails({
              commit: {
                oid: 'diff-commit-oid',
              }
            });
          });

      const response = await handleStatus(SUCCESS_HOOK);
      t.deepEqual(response.handled, false, 'webhook should not be handled.');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handleStatus]: should not handle error hook if the commit SHA is not the latest',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return newFakePRDetails({
              commit: {
                oid: 'diff-commit-oid',
              }
            });
          });

      const response = await handleStatus(ERROR_HOOK);
      t.deepEqual(response.handled, false, 'webhook should not be handled.');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial('[handleStatus]: should not handle pending hooks', async (t) => {
  t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
    return FAKE_LOGIN_DETAILS;
  });

  t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
      .callsFake(() => {
        return PR_DETAILS;
      });

  const response = await handleStatus(PENDING_HOOK);
  t.deepEqual(response.message, 'Unhandled state: \'pending\'');
  t.deepEqual(response.handled, false, 'webhook should not be handled.');
  t.deepEqual(sendStub.callCount, 0, 'sendNotification should not be called');
});

test.serial(
    '[handleStatus]: should handle success hook but not do anything is commit isn\'t success',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return PR_DETAILS;
          });

      t.context.sandbox.stub(pullRequestsModel, 'getAutomergeOpts')
          .callsFake(async () => {
            return null;
          });

      const response = await handleStatus(SUCCESS_HOOK);
      t.deepEqual(
          response.message,
          'Status of the PR\'s commit is not \'SUCCESS\' or \'null\': \'PENDING\'');
      t.deepEqual(response.handled, true, 'webhook should be handled.');
      t.deepEqual(
          performAutomergeStub.callCount,
          0,
          'No automerge should be attempted');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });

test.serial(
    '[handleStatus]: should handle success hook but not automerge if its not configured for PR',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            const details = newFakePRDetails({});
            details.commit.state = 'SUCCESS';
            return details;
          });

      t.context.sandbox.stub(pullRequestsModel, 'getAutomergeOpts')
          .callsFake(async () => {
            return null;
          });

      const response = await handleStatus(SUCCESS_HOOK);
      t.deepEqual(response.message, 'Automerge not setup');
      t.deepEqual(response.handled, true, 'webhook should be handled.');
      t.deepEqual(
          performAutomergeStub.callCount,
          0,
          'No automerge should be attempted');
      t.deepEqual(sendStub.callCount, 0, 'sendNotification should be called');
    });

test.serial(
    '[handleStatus]: should handle success hook but not automerge if mergeType is null',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            const details = newFakePRDetails({});
            details.commit.state = 'SUCCESS';
            return details;
          });

      t.context.sandbox.stub(pullRequestsModel, 'getAutomergeOpts')
          .callsFake(async () => {
            return {
              mergeType: null,
            };
          });

      const response = await handleStatus(SUCCESS_HOOK);
      t.deepEqual(response.message, 'Automerge not setup');
      t.deepEqual(response.handled, true, 'webhook should be handled.');
      t.deepEqual(
          performAutomergeStub.callCount,
          0,
          'No automerge should be attempted');
      t.deepEqual(sendStub.callCount, 0, 'sendNotification should be called');
    });

test.serial(
    '[handleStatus]: should handle success hook but not automerge if mergeType is manual',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            const details = newFakePRDetails({});
            details.commit.state = 'SUCCESS';
            return details;
          });

      t.context.sandbox.stub(pullRequestsModel, 'getAutomergeOpts')
          .callsFake(async () => {
            return {
              mergeType: 'manual',
            };
          });

      const response = await handleStatus(SUCCESS_HOOK);
      t.deepEqual(response.message, 'Automerge not setup');
      t.deepEqual(response.handled, true, 'webhook should be handled.');
      t.deepEqual(
          performAutomergeStub.callCount,
          0,
          'No automerge should be attempted');
      t.deepEqual(sendStub.callCount, 0, 'sendNotification should be called');
    });

test.serial(
    '[handleStatus]: should handle success hook and notify users of successful automerge',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return PR_DETAILS;
          });

      t.context.sandbox.stub(pullRequestsModel, 'getAutomergeOpts')
          .callsFake(async () => {
            return {
              mergeType: 'squash',
            };
          });

      performAutomergeStub.callsFake(() => {
        return Promise.resolve(true);
      });

      const response = await handleStatus(SUCCESS_HOOK);
      t.deepEqual(response.handled, true, 'webhook should be handled.');
      t.deepEqual(response.message, 'Automerge successful');
      t.deepEqual(
          performAutomergeStub.callCount, 1, 'Automerge should be attempted');
      t.deepEqual(
          sendStub.callCount, 1, 'sendNotification should not be called');
      t.deepEqual(
          sendStub.args[0][0], 'test-pr-author', 'Notification receiver');
      t.deepEqual(
          sendStub.args[0][1],
          {
            title: 'Automerge complete for \'test-title\'',
            body: '[status-test] test-title',
            icon: '/images/notification-images/icon-completed-192x192.png',
            data: {
              pullRequest: {
                gqlId: 'test-pr-id',
              },
              url: 'http://test-url.com',
            },
            requireInteraction: false,
            tag: 'pr-status-owner-login/status-test/1',
          },
          'Notification options');
    });

test.serial(
    '[handleStatus]: should handle success hook and notify users of an errored automerge *without* Githubs error response msg',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            const details = newFakePRDetails({});
            details.commit.state = 'SUCCESS';
            return details;
          });

      t.context.sandbox.stub(pullRequestsModel, 'getAutomergeOpts')
          .callsFake(async () => {
            return {
              mergeType: 'rebase',
            };
          });

      performAutomergeStub.callsFake(() => {
        return Promise.reject(new Error('Injected Error'));
      });

      const response = await handleStatus(SUCCESS_HOOK);
      t.deepEqual(
          response.message, 'Unable to perform automerge: \'Injected Error\'');
      t.deepEqual(response.handled, true, 'webhook should be handled.');
      t.deepEqual(
          performAutomergeStub.callCount, 1, 'Automerge should be attempted');
      t.deepEqual(
          sendStub.callCount, 1, 'sendNotification should not be called');
      t.deepEqual(
          sendStub.args[0][0], 'test-pr-author', 'Notification receiver');
      t.deepEqual(
          sendStub.args[0][1],
          {
            title: 'Automerge failed for \'test-title\'',
            body: '[status-test] test-title',
            icon: '/images/notification-images/icon-error-192x192.png',
            data: {
              pullRequest: {
                gqlId: 'test-pr-id',
              },
              url: 'http://test-url.com',
            },
            requireInteraction: false,
            tag: 'pr-status-owner-login/status-test/1',
          },
          'Notification options');
    });

test.serial(
    '[handleStatus]: should handle success hook and notify users of an errored automerge using Githubs error response msg',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            const details = newFakePRDetails({});
            details.commit.state = 'SUCCESS';
            return details;
          });

      t.context.sandbox.stub(pullRequestsModel, 'getAutomergeOpts')
          .callsFake(async () => {
            return {
              mergeType: 'rebase',
            };
          });

      performAutomergeStub.callsFake(() => {
        return Promise.reject({
          error: {
            message: 'Injected Error',
          },
        });
      });

      const response = await handleStatus(SUCCESS_HOOK);
      t.deepEqual(
          response.message, 'Unable to perform automerge: \'Injected Error\'');
      t.deepEqual(response.handled, true, 'webhook should be handled.');
      t.deepEqual(
          performAutomergeStub.callCount, 1, 'Automerge should be attempted');
      t.deepEqual(
          sendStub.callCount, 1, 'sendNotification should not be called');
      t.deepEqual(
          sendStub.args[0][0], 'test-pr-author', 'Notification receiver');
      t.deepEqual(
          sendStub.args[0][1],
          {
            title: 'Automerge failed for \'test-title\'',
            body: '[status-test] test-title',
            icon: '/images/notification-images/icon-error-192x192.png',
            data: {
              pullRequest: {
                gqlId: 'test-pr-id',
              },
              url: 'http://test-url.com',
            },
            requireInteraction: false,
            tag: 'pr-status-owner-login/status-test/1',
          },
          'Notification options');
    });

test.serial(
    '[handleStatus]: should notify author for new error hook', async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return PR_DETAILS;
          });

      t.context.sandbox.stub(pullRequestsModel, 'getCommitDetails')
          .callsFake(() => {
            return Promise.resolve(null);
          });

      const response = await handleStatus(ERROR_HOOK);
      t.deepEqual(response.handled, true, 'webhook should be handled.');
      t.deepEqual(sendStub.callCount, 1, 'sendNotification should be called');
      t.deepEqual(
          sendStub.args[0][0], 'test-pr-author', 'Notification receiver');
      t.deepEqual(
          sendStub.args[0][1],
          {
            title: 'test-description',
            body: '[status-test] test-title',
            icon: '/images/notification-images/icon-error-192x192.png',
            data: {
              pullRequest: {
                gqlId: 'test-pr-id',
              },
              url: 'http://test-url.com',
            },
            requireInteraction: false,
            tag: 'pr-status-owner-login/status-test/1',
          },
          'Notification options');
    });

test.serial(
    '[handleStatus]: should notify author for error hook if new state is different from previous state',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return PR_DETAILS;
          });

      t.context.sandbox.stub(pullRequestsModel, 'getCommitDetails')
          .callsFake(() => {
            return Promise.resolve({
              status: 'SUCCESS',
            });
          });

      const response = await handleStatus(ERROR_HOOK);
      t.deepEqual(response.handled, true, 'webhook should be handled.');
      t.deepEqual(sendStub.callCount, 1, 'sendNotification should be called');
      t.deepEqual(
          sendStub.args[0][0], 'test-pr-author', 'Notification receiver');
      t.deepEqual(
          sendStub.args[0][1],
          {
            title: 'test-description',
            body: '[status-test] test-title',
            icon: '/images/notification-images/icon-error-192x192.png',
            data: {
              pullRequest: {
                gqlId: 'test-pr-id',
              },
              url: 'http://test-url.com',
            },
            requireInteraction: false,
            tag: 'pr-status-owner-login/status-test/1',
          },
          'Notification options');
    });

test.serial(
    '[handleStatus]: should do nothing for error hook if the commits state is the same',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        return FAKE_LOGIN_DETAILS;
      });

      t.context.sandbox.stub(getPRFromCommitModule, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return PR_DETAILS;
          });

      t.context.sandbox.stub(pullRequestsModel, 'getCommitDetails')
          .callsFake(() => {
            return Promise.resolve({
              status: 'error',
            });
          });

      const response = await handleStatus(ERROR_HOOK);
      t.deepEqual(response.handled, false, 'webhook should be handled.');
      t.deepEqual(
          response.message,
          'The previous commit details and the hook details are the same state.');
      t.deepEqual(
          sendStub.callCount, 0, 'sendNotification should not be called');
    });
