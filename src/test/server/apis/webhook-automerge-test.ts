import anyTest, {TestInterface} from 'ava';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import * as notificationController from '../../../server/controllers/notifications';
import {handleStatus} from '../../../server/controllers/webhook-events/status';
import {userModel} from '../../../server/models/userModel';
import * as commitPRUtil from '../../../server/utils/get-pr-from-commit';
import * as automergeUtil from '../../../server/utils/perform-automerge';
import {initFirestore} from '../../../utils/firestore';
import {initSecrets} from '../../../utils/secrets';

const TEST_SECRETS = {
  GITHUB_CLIENT_ID: 'ClientID',
  GITHUB_CLIENT_SECRET: 'ClientSecret',
  PUBLIC_VAPID_KEY:
      'BPtJjYprRvU3TOb0tw3FrVbLww3bp7ssGjX99PFlqIOb3b8uOH4_Q21GYhwsDRwcfToaFVVeOxWOq5XaXD1MGdw',
  PRIVATE_VAPID_KEY: 'o1P9aXm-QPZezF_8b7aQabivhv3QqaB0yg5zoFs6-qc',
};

type TestContext = {
  sandbox: SinonSandbox
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
  initSecrets(TEST_SECRETS);
});

test.beforeEach(async (t) => {
  t.context.sandbox = sinon.sandbox.create();
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
});

test.serial(
    '[webhook to automerge]: Should not handle if no login details',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getLoginDetails').callsFake(() => {
        return null;
      });

      const response = await handleStatus({
        sha: 'test-sha',
        name: 'project-health/status-test',
        state: 'success',
        description: '',
        repository: {
          name: 'status-test',
        },
        commit: {
          author: {
            login: 'project-health1',
          },
        },
      });
      t.deepEqual(response.handled, false);
    });

test.serial(
    '[webhook to automerge]: Should not handle if no PR Details', async (t) => {
      t.context.sandbox.stub(userModel, 'getLoginDetails')
          .callsFake((username: string) => {
            // Return some fake details to ensure
            return {
              githubToken: 'injected-fake-token',
              username,
              scopes: null,
            };
          });
      const commitToPRStub =
          t.context.sandbox.stub(commitPRUtil, 'getPRDetailsFromCommit')
              .callsFake(() => {
                return null;
              });

      const response = await handleStatus({
        sha: 'test-sha',
        name: 'project-health/status-test',
        state: 'success',
        description: '',
        repository: {
          name: 'status-test',
        },
        commit: {
          author: {
            login: 'project-health1',
          },
        },
      });
      t.deepEqual(response.handled, false);
      t.deepEqual(commitToPRStub.callCount, 1);
      t.deepEqual(commitToPRStub.args[0][0], 'injected-fake-token');
      t.deepEqual(commitToPRStub.args[0][1], 'project-health/status-test');
      t.deepEqual(commitToPRStub.args[0][2], 'test-sha');
    });

test.serial(
    '[webhook to automerge]: Should not handle if PR has a non-success state',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getLoginDetails')
          .callsFake((username: string) => {
            // Return some fake details to ensure
            return {
              githubToken: 'injected-fake-token',
              username,
              scopes: null,
            };
          });
      const commitToPRStub =
          t.context.sandbox.stub(commitPRUtil, 'getPRDetailsFromCommit')
              .callsFake(() => {
                return {
                  commit: {
                    state: 'PENDING',
                  }
                };
              });

      const response = await handleStatus({
        sha: 'test-sha',
        name: 'project-health/status-test',
        state: 'success',
        description: '',
        repository: {
          name: 'status-test',
        },
        commit: {
          author: {
            login: 'project-health1',
          },
        },
      });
      t.deepEqual(response.handled, false);
      t.deepEqual(commitToPRStub.callCount, 1);
      t.deepEqual(commitToPRStub.args[0][0], 'injected-fake-token');
      t.deepEqual(commitToPRStub.args[0][1], 'project-health/status-test');
      t.deepEqual(commitToPRStub.args[0][2], 'test-sha');
    });

test.serial(
    '[webhook to automerge]: Should handle if PR has a success state',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getLoginDetails')
          .callsFake((username: string) => {
            // Return some fake details to ensure
            return {
              githubToken: 'injected-fake-token',
              username,
              scopes: null,
            };
          });

      const prDetails = {
        commit: {
          state: 'SUCCESS',
        }
      };
      t.context.sandbox.stub(commitPRUtil, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return prDetails;
          });

      const automergeStub =
          t.context.sandbox.stub(automergeUtil, 'performAutomerge')
              .callsFake(() => {
                return Promise.resolve();
              });

      const response = await handleStatus({
        sha: 'test-sha',
        name: 'project-health/status-test',
        state: 'success',
        description: '',
        repository: {
          name: 'status-test',
        },
        commit: {
          author: {
            login: 'project-health1',
          },
        },
      });
      t.deepEqual(response.handled, true);
      t.deepEqual(automergeStub.callCount, 1);
      t.deepEqual(automergeStub.args[0][0], 'injected-fake-token');
      t.deepEqual(automergeStub.args[0][1], 'project-health/status-test');
      t.deepEqual(automergeStub.args[0][2], prDetails);
    });

test.serial(
    '[webhook to automerge]: Should send notification if automerge fails',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getLoginDetails')
          .callsFake((username: string) => {
            // Return some fake details to ensure
            return {
              githubToken: 'injected-fake-token',
              username,
              scopes: null,
            };
          });

      const prDetails = {
        title: 'pr-title',
        url: 'http://inject-url.com',
        author: 'project-health1',
        commit: {
          state: 'SUCCESS',
        }
      };
      t.context.sandbox.stub(commitPRUtil, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return prDetails;
          });

      const automergeStub =
          t.context.sandbox.stub(automergeUtil, 'performAutomerge')
              .callsFake(() => {
                return Promise.reject(new Error('injected-error'));
              });

      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');

      const response = await handleStatus({
        sha: 'test-sha',
        name: 'project-health/status-test',
        state: 'success',
        description: '',
        repository: {
          name: 'status-test',
        },
        commit: {
          author: {
            login: 'project-health1',
          },
        },
      });

      t.deepEqual(response.handled, true);
      t.deepEqual(automergeStub.callCount, 1);
      t.deepEqual(automergeStub.args[0][0], 'injected-fake-token');
      t.deepEqual(automergeStub.args[0][1], 'project-health/status-test');
      t.deepEqual(automergeStub.args[0][2], prDetails);

      t.deepEqual(sendStub.callCount, 1);
      t.deepEqual(sendStub.args[0][0], 'project-health1');
      t.deepEqual(sendStub.args[0][1], {
        title: 'Auto-merge failed: \'injected-error\'',
        body: '[status-test] pr-title',
        requireInteraction: false,
        icon: '/images/notification-images/icon-192x192.png',
        data: {
          url: 'http://inject-url.com',
        }
      });
    });

test.serial(
    '[webhook to automerge]: Should send notification (with github error) if automerge fails',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getLoginDetails')
          .callsFake((username: string) => {
            // Return some fake details to ensure
            return {
              githubToken: 'injected-fake-token',
              username,
              scopes: null,
            };
          });

      const prDetails = {
        title: 'pr-title',
        url: 'http://inject-url.com',
        author: 'project-health1',
        commit: {
          state: 'SUCCESS',
        }
      };
      t.context.sandbox.stub(commitPRUtil, 'getPRDetailsFromCommit')
          .callsFake(() => {
            return prDetails;
          });

      const automergeStub =
          t.context.sandbox.stub(automergeUtil, 'performAutomerge')
              .callsFake(() => {
                return Promise.reject({
                  error: {
                    message: 'injected-error',
                  }
                });
              });

      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');

      const response = await handleStatus({
        sha: 'test-sha',
        name: 'project-health/status-test',
        state: 'success',
        description: '',
        repository: {
          name: 'status-test',
        },
        commit: {
          author: {
            login: 'project-health1',
          },
        },
      });

      t.deepEqual(response.handled, true);
      t.deepEqual(automergeStub.callCount, 1);
      t.deepEqual(automergeStub.args[0][0], 'injected-fake-token');
      t.deepEqual(automergeStub.args[0][1], 'project-health/status-test');
      t.deepEqual(automergeStub.args[0][2], prDetails);

      t.deepEqual(sendStub.callCount, 1);
      t.deepEqual(sendStub.args[0][0], 'project-health1');
      t.deepEqual(sendStub.args[0][1], {
        title: 'Auto-merge failed: \'injected-error\'',
        body: '[status-test] pr-title',
        requireInteraction: false,
        icon: '/images/notification-images/icon-192x192.png',
        data: {
          url: 'http://inject-url.com',
        }
      });
    });
