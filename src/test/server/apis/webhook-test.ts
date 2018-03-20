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
import {handleStatus} from '../../../server/controllers/webhook-events/status';
import {pullRequestsModel} from '../../../server/models/pullRequestsModel';
import {userModel} from '../../../server/models/userModel';
import {initFirestore} from '../../../utils/firestore';
import {github, initGithub} from '../../../utils/github';
import {initSecrets} from '../../../utils/secrets';

const hookJsonDir = path.join(__dirname, '..', '..', 'static', 'webhook-data');

const TEST_SECRETS = {
  GITHUB_CLIENT_ID: 'ClientID',
  GITHUB_CLIENT_SECRET: 'ClientSecret',
  PUBLIC_VAPID_KEY:
      'BPtJjYprRvU3TOb0tw3FrVbLww3bp7ssGjX99PFlqIOb3b8uOH4_Q21GYhwsDRwcfToaFVVeOxWOq5XaXD1MGdw',
  PRIVATE_VAPID_KEY: 'o1P9aXm-QPZezF_8b7aQabivhv3QqaB0yg5zoFs6-qc',
};

const TEST_PR_ID = '2';

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

  await pullRequestsModel.deletePR(TEST_PR_ID);
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
  await new Promise((resolve) => t.context.server.close(resolve));
  await pullRequestsModel.deletePR(TEST_PR_ID);
});

test.serial(
    'Webhook pull_request_review: submitted-state-changes_requested.json',
    async (t) => {
      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');

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
          icon: '/images/notification-images/icon-192x192.png',
          data: {
            url: 'https://github.com/PolymerLabs/project-health/pull/112'
          }
        }
      ]);
    });

test.serial(
    'Webhook pull_request_review: submitted-state-approved.json', async (t) => {
      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');

      const eventContent = await fs.readJSON(path.join(
          hookJsonDir, 'pull_request_review', 'submitted-state-approved.json'));
      const response = await handlePullRequestReview(eventContent);
      t.deepEqual(response.handled, true);

      t.deepEqual(sendStub.callCount, 1);
      t.deepEqual(sendStub.args[0], [
        'gauntface',
        {
          title: 'gauntface approved your PR',
          body: '[project-health] Add favicon',
          requireInteraction: true,
          icon: '/images/notification-images/icon-192x192.png',
          data: {
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
          icon: '/images/notification-images/icon-192x192.png',
          data:
              {url: 'https://github.com/PolymerLabs/project-health/pull/65'}
        }
      ]);
    });

test.serial(
    'Webhook pull_request_review: submitted-state-self-commented.json',
    async (t) => {
      const sendStub =
          t.context.sandbox.stub(notificationController, 'sendNotification');

      const eventContent = await fs.readJSON(path.join(
          hookJsonDir,
          'pull_request_review',
          'submitted-state-self-commented.json'));
      const response = await handlePullRequestReview(eventContent);
      t.deepEqual(response.handled, true);

      t.deepEqual(sendStub.callCount, 0);
    });

test.serial(
    'Webhook status: error-travis.json where CL author has no token',
    async (t) => {
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
    },
    pull_request: {
      title: '',
      user: {
        login: '',
      },
      html_url: '',
    },
    repository: {
      name: '',
    },
  });
  t.deepEqual(response.handled, false);
  t.deepEqual(sendStub.callCount, 0);
});

test.serial('Webhook pull_request_review: unknown review state', async (t) => {
  const sendStub =
      t.context.sandbox.stub(notificationController, 'sendNotification');

  const response = await handlePullRequestReview({
    action: 'submitted',
    review: {
      state: 'unknown',
      user: {
        login: 'login',
      },
    },
    pull_request: {
      title: '',
      user: {
        login: 'example-pr-login',
      },
      html_url: '',
    },
    repository: {
      name: '',
    },
  });
  t.deepEqual(response.handled, true);
  t.deepEqual(sendStub.callCount, 0);
});

test.serial(
    'Webhook status: error-travis.json with user token, no PRs', async (t) => {
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
    'Webhook status: error-travis.json with user token, no author',
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
    'Webhook status: error-travis.json with user token, unknown type response',
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
    'Webhook status: error-travis.json with user token, no commits',
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
    'Webhook status: error-travis.json with user token, null commit',
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

test.failing(
    'Webhook status: error-travis.json with user token, incorrect commit',
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
                      nodes: [{
                        commit: {
                          oid: 'diff-sha',
                        },
                      }],
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
    'Webhook status: error-travis.json with user token and required info (and not duplicate)',
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
                    id: TEST_PR_ID,
                    title: 'Injected title',
                    url: 'https://example.com/pr/123',
                    author: {login: 'injected-pr-author'},
                    commits: {
                      nodes: [{
                        commit: {
                          oid: eventContent.sha,
                        },
                      }],
                    }
                  }]
                }
              }
            };
          });

      const response = await handleStatus(eventContent);
      t.deepEqual(response.handled, false);
      t.deepEqual(sendStub.callCount, 0);

      sendStub.reset();
    });

test.serial('Webhook status: pending-travis.json', async (t) => {
  const sendStub =
      t.context.sandbox.stub(notificationController, 'sendNotification');

  const eventContent = await fs.readJSON(
      path.join(hookJsonDir, 'status', 'pending-travis.json'));
  const response = await handleStatus(eventContent);
  t.deepEqual(response.handled, false);
  t.deepEqual(sendStub.callCount, 0);
});

test.serial('Webhook status: success-travis.json', async (t) => {
  const sendStub =
      t.context.sandbox.stub(notificationController, 'sendNotification');
  const eventContent = await fs.readJSON(
      path.join(hookJsonDir, 'status', 'success-travis.json'));
  const response = await handleStatus(eventContent);
  t.deepEqual(response.handled, false);
  t.deepEqual(sendStub.callCount, 0);
});

test.serial('Webhook pull_request: review_requested.json', async (t) => {
  const sendStub =
      t.context.sandbox.stub(notificationController, 'sendNotification');

  const eventContent = await fs.readJSON(
      path.join(hookJsonDir, 'pull_request', 'review_requested.json'));
  const response = await handlePullRequest(eventContent);
  t.deepEqual(response.handled, true);
  t.deepEqual(sendStub.callCount, 1);
  t.deepEqual(sendStub.args[0], [
    'samuelli',
    {
      title: 'gauntface requested a review',
      body: '[project-health] Add icon to notification and correcting URL link',
      requireInteraction: true,
      icon: '/images/notification-images/icon-192x192.png',
      data: {url: 'https://github.com/PolymerLabs/project-health/pull/146'}
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
