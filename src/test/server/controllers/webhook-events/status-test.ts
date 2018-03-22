import anyTest, {TestInterface} from 'ava';
import * as fs from 'fs-extra';
import {Server} from 'http';
import * as path from 'path';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {startTestReplayServer} from '../../../../replay-server';
import * as notificationController from '../../../../server/controllers/notifications';
import {handleStatus} from '../../../../server/controllers/webhook-events/status';
import {pullRequestsModel} from '../../../../server/models/pullRequestsModel';
import {userModel} from '../../../../server/models/userModel';
import {initFirestore} from '../../../../utils/firestore';
import {github, initGithub} from '../../../../utils/github';
import {initSecrets} from '../../../../utils/secrets';

const hookJsonDir =
    path.join(__dirname, '..', '..', '..', 'static', 'webhook-data');

const TEST_SECRETS = {
  GITHUB_CLIENT_ID: 'ClientID',
  GITHUB_CLIENT_SECRET: 'ClientSecret',
  PUBLIC_VAPID_KEY:
      'BPtJjYprRvU3TOb0tw3FrVbLww3bp7ssGjX99PFlqIOb3b8uOH4_Q21GYhwsDRwcfToaFVVeOxWOq5XaXD1MGdw',
  PRIVATE_VAPID_KEY: 'o1P9aXm-QPZezF_8b7aQabivhv3QqaB0yg5zoFs6-qc',
};

const TEST_PR_ID = '2';
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
    '[handleStatus]: error status where CL author has no token', async (t) => {
      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');

      t.context.sandbox.stub(userModel, 'getLoginDetails').callsFake(() => {
        // Return no details to act as no token
        return null;
      });

      const eventContent = await fs.readJSON(
          path.join(hookJsonDir, 'status', 'error-travis.json'));
      const response = await handleStatus(eventContent);
      t.deepEqual(response.handled, false);
      t.deepEqual(sendStub.callCount, 0);
    });

test.serial(
    '[handleStatus]: error status with user token but no PRs', async (t) => {
      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');
      t.context.sandbox.stub(userModel, 'getLoginDetails')
          .callsFake((username: string) => {
            // Return some fake details to ensure
            return {
              githubToken: 'inject-fake-token',
              username,
              scopes: null,
            };
          });
      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query')
          .callsFake(({context}: {context: {token: string}}) => {
            t.deepEqual(context.token, 'inject-fake-token');

            return {data: {}};
          });

      const eventContent = await fs.readJSON(
          path.join(hookJsonDir, 'status', 'error-travis.json'));
      const response = await handleStatus(eventContent);
      t.deepEqual(response.handled, false);
      t.deepEqual(sendStub.callCount, 0);
    });

test.serial(
    '[handleStatus]: error status with user token but no author', async (t) => {
      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');
      t.context.sandbox.stub(userModel, 'getLoginDetails')
          .callsFake((username: string) => {
            // Return some fake details to ensure
            return {
              githubToken: 'inject-fake-token',
              username,
              scopes: null,
            };
          });
      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query')
          .callsFake(({context}: {context: {token: string}}) => {
            t.deepEqual(context.token, 'inject-fake-token');

            return {
              data: {
                pullRequests: {
                  nodes: [{
                    __typename: 'PullRequest',
                  }]
                }
              }
            };
          });

      const eventContent = await fs.readJSON(
          path.join(hookJsonDir, 'status', 'error-travis.json'));
      const response = await handleStatus(eventContent);
      t.deepEqual(response.handled, false);
      t.deepEqual(sendStub.callCount, 0);
    });

test.serial(
    '[handleStatus]: error status with user token but unknown type response',
    async (t) => {
      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');
      t.context.sandbox.stub(userModel, 'getLoginDetails')
          .callsFake((username: string) => {
            // Return some fake details to ensure
            return {
              githubToken: 'inject-fake-token',
              username,
              scopes: null,
            };
          });
      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query')
          .callsFake(({context}: {context: {token: string}}) => {
            t.deepEqual(context.token, 'inject-fake-token');

            return {
              data: {
                pullRequests: {
                  nodes: [{
                    __typename: 'Other',
                  }]
                }
              }
            };
          });

      const eventContent = await fs.readJSON(
          path.join(hookJsonDir, 'status', 'error-travis.json'));
      const response = await handleStatus(eventContent);
      t.deepEqual(response.handled, false);
      t.deepEqual(sendStub.callCount, 0);
    });

test.serial(
    '[handleStatus]: error status with user token but no commits',
    async (t) => {
      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');
      t.context.sandbox.stub(userModel, 'getLoginDetails')
          .callsFake((username: string) => {
            // Return some fake details to ensure
            return {
              githubToken: 'inject-fake-token',
              username,
              scopes: null,
            };
          });
      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query')
          .callsFake(({context}: {context: {token: string}}) => {
            t.deepEqual(context.token, 'inject-fake-token');

            return {
              data: {
                pullRequests: {
                  nodes: [{
                    __typename: 'PullRequest',
                    author: {login: 'injected-pr-author'},
                    commits: {}
                  }]
                }
              }
            };
          });

      const eventContent = await fs.readJSON(
          path.join(hookJsonDir, 'status', 'error-travis.json'));
      const response = await handleStatus(eventContent);
      t.deepEqual(response.handled, false);
      t.deepEqual(sendStub.callCount, 0);
    });

test.serial(
    '[handleStatus]: error status with user token but null commit',
    async (t) => {
      const eventContent = await fs.readJSON(
          path.join(hookJsonDir, 'status', 'error-travis.json'));

      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');
      t.context.sandbox.stub(userModel, 'getLoginDetails')
          .callsFake((username: string) => {
            // Return some fake details to ensure
            return {
              githubToken: 'inject-fake-token',
              username,
              scopes: null,
            };
          });
      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query')
          .callsFake(({context}: {context: {token: string}}) => {
            t.deepEqual(context.token, 'inject-fake-token');

            return {
              data: {
                pullRequests: {
                  nodes: [{
                    __typename: 'PullRequest',
                    author: {login: 'injected-pr-author'},
                    commits: {
                      nodes: [null],
                    }
                  }]
                }
              }
            };
          });

      const response = await handleStatus(eventContent);
      t.deepEqual(response.handled, false);
      t.deepEqual(sendStub.callCount, 0);
    });

test.serial(
    '[handleStatus]: error status with all required info', async (t) => {
      const eventContent = await fs.readJSON(
          path.join(hookJsonDir, 'status', 'error-travis.json'));

      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');
      t.context.sandbox.stub(userModel, 'getLoginDetails')
          .callsFake((username: string) => {
            // Return some fake details
            return {
              githubToken: 'inject-fake-token',
              username,
              scopes: null,
            };
          });
      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query')
          .callsFake(({context}: {context: {token: string}}) => {
            t.deepEqual(
                context.token, 'inject-fake-token', 'Use provided login token');

            return {
              data: {
                pullRequests: {
                  nodes: [{
                    __typename: 'PullRequest',
                    id: TEST_PR_ID,
                    number: 1,
                    title: 'Injected title',
                    url: 'https://example.com/pr/123',
                    author: {login: 'injected-pr-author'},
                    state: 'OPEN',
                    repository: {
                      name: 'test-repo',
                      owner: {
                        login: 'test-owner',
                      }
                    },
                    commits: {
                      nodes: [{
                        commit: {
                          oid: eventContent.sha,
                        },
                      }],
                    },
                  }]
                }
              }
            };
          });

      const response = await handleStatus(eventContent);
      t.deepEqual(response.handled, true, 'Status should be handled');
      t.deepEqual(sendStub.callCount, 1, 'Notification count should be 1');
      t.deepEqual(sendStub.args[0][0], 'injected-pr-author');
      t.deepEqual(sendStub.args[0][1], {
        title: 'The Travis CI build could not complete due to an error',
        body: '[project-health] Injected title',
        requireInteraction: false,
        data: {
          url: 'https://example.com/pr/123',
        },
        tag: 'pr-PolymerLabs/project-health/1'
      });

      sendStub.reset();
    });

test.serial(
    '[handleStatus]: error status with all required info but PR closed',
    async (t) => {
      const eventContent = await fs.readJSON(
          path.join(hookJsonDir, 'status', 'error-travis.json'));

      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');
      t.context.sandbox.stub(userModel, 'getLoginDetails')
          .callsFake((username: string) => {
            // Return some fake details
            return {
              githubToken: 'inject-fake-token',
              username,
              scopes: null,
            };
          });
      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query')
          .callsFake(({context}: {context: {token: string}}) => {
            t.deepEqual(
                context.token, 'inject-fake-token', 'Use provided login token');

            return {
              data: {
                pullRequests: {
                  nodes: [{
                    __typename: 'PullRequest',
                    id: TEST_PR_ID,
                    number: 1,
                    title: 'Injected title',
                    url: 'https://example.com/pr/123',
                    author: {login: 'injected-pr-author'},
                    state: 'CLOSED',
                    repository: {
                      name: 'test-repo',
                      owner: {
                        login: 'test-owner',
                      }
                    },
                    commits: {
                      nodes: [{
                        commit: {
                          oid: eventContent.sha,
                        },
                      }],
                    },
                  }]
                }
              }
            };
          });

      const response = await handleStatus(eventContent);
      t.deepEqual(response.handled, false, 'Status should not be handled');
      t.deepEqual(sendStub.callCount, 0, 'Notification count should be 0');

      sendStub.reset();
    });

test.serial('[handleStatus]: pending status', async (t) => {
  const sendStub =
      t.context.sandbox.stub(notificationController, 'sendNotification');

  const eventContent = await fs.readJSON(
      path.join(hookJsonDir, 'status', 'pending-travis.json'));
  const response = await handleStatus(eventContent);
  t.deepEqual(response.handled, false);
  t.deepEqual(sendStub.callCount, 0);
});

test.serial('[handleStatus]: success status', async (t) => {
  const sendStub =
      t.context.sandbox.stub(notificationController, 'sendNotification');
  const eventContent = await fs.readJSON(
      path.join(hookJsonDir, 'status', 'success-travis.json'));
  const response = await handleStatus(eventContent);
  t.deepEqual(response.handled, false);
  t.deepEqual(sendStub.callCount, 0);
});
