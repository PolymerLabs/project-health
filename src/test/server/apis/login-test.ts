import anyTest, {TestInterface} from 'ava';
import * as express from 'express';
import * as fetchModule from 'node-fetch';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {handleLoginRequest} from '../../../server/apis/login';
import {userModel} from '../../../server/models/userModel';
import {initFirestore} from '../../../utils/firestore';
import {initSecrets} from '../../../utils/secrets';
import {newFakeSecrets} from '../../utils/newFakeSecrets';

type TestContext = {
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
  initSecrets(newFakeSecrets());
});

/**
 * Generates the test context object before each test.
 */
test.beforeEach(async (t) => {
  t.context = {
    sandbox: sinon.sandbox.create(),
  };
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
});

test.serial('[login-api]: should handle github error', async (t) => {
  t.context.sandbox.stub(fetchModule, 'default').callsFake(() => {
    const fakeGithubResponse = {error: 'Injected error.'};
    return {
      json: () => {
        return fakeGithubResponse;
      },
    };
  });

  const response = await handleLoginRequest({} as express.Request);
  if (!('error' in response)) {
    throw new Error('Expected error response');
  }
  t.deepEqual(response.error.code, 'github-auth-failed');
});

test.serial(
    '[login-api]: should handle github token with no scopes', async (t) => {
      t.context.sandbox.stub(fetchModule, 'default').callsFake(() => {
        const fakeGithubResponse = {
          'access_token': 'access-token-1234',
        };
        return {
          json: () => {
            return fakeGithubResponse;
          },
        };
      });

      t.context.sandbox.stub(userModel, 'generateNewUserToken')
          .callsFake((accessToken: string, userScopes: string[]) => {
            t.deepEqual(accessToken, 'access-token-1234');
            t.deepEqual(userScopes, []);
            return 'generated-token-1234';
          });

      const request = {cookies: {}};
      const response = await handleLoginRequest(request as express.Request);
      if (!('data' in response)) {
        throw new Error('Expected data response');
      }
      if (!response.cookies) {
        throw new Error('Expected cookies to be set');
      }
      t.deepEqual(response.statusCode, 200);
      t.deepEqual(response.data.status, 'ok');
      t.deepEqual(response.cookies['health-id'], {
        value: 'generated-token-1234',
        options: {
          httpOnly: true,
        }
      });
    });

test.serial(
    '[login-api]: should handle github token with scopes', async (t) => {
      t.context.sandbox.stub(fetchModule, 'default').callsFake(() => {
        const fakeGithubResponse = {
          'access_token': 'access-token-1234',
          scope: 'scope-1,scope-2'
        };
        return {
          json: () => {
            return fakeGithubResponse;
          },
        };
      });

      t.context.sandbox.stub(userModel, 'generateNewUserToken')
          .callsFake((accessToken: string, userScopes: string[]) => {
            t.deepEqual(accessToken, 'access-token-1234');
            t.deepEqual(userScopes, ['scope-1', 'scope-2']);
            return 'generated-token-1234';
          });

      const request = {cookies: {}};
      const response = await handleLoginRequest(request as express.Request);
      if (!('data' in response)) {
        throw new Error('Expected data response');
      }
      if (!response.cookies) {
        throw new Error('Expected cookies to be set');
      }
      t.deepEqual(response.statusCode, 200);
      t.deepEqual(response.data.status, 'ok');
      t.deepEqual(response.cookies['health-id'], {
        value: 'generated-token-1234',
        options: {
          httpOnly: true,
        }
      });
    });

test.serial('[login-api]: should delete old user token', async (t) => {
  t.context.sandbox.stub(fetchModule, 'default').callsFake(() => {
    const fakeGithubResponse = {
      'access_token': 'access-token-1234',
    };
    return {
      json: () => {
        return fakeGithubResponse;
      },
    };
  });

  t.context.sandbox.stub(userModel, 'generateNewUserToken')
      .callsFake((accessToken: string, userScopes: string[]) => {
        t.deepEqual(accessToken, 'access-token-1234');
        t.deepEqual(userScopes, []);
        return 'generated-token-1234';
      });
  t.context.sandbox.stub(userModel, 'deleteUserToken')
      .callsFake((token: string) => {
        t.deepEqual(token, 'original-token-1234');
      });

  const request = {cookies: {'health-id': 'original-token-1234'}};
  const response = await handleLoginRequest(request as express.Request);
  if (!('data' in response)) {
    throw new Error('Expected data response');
  }
  if (!response.cookies) {
    throw new Error('Expected cookies to be set');
  }
  t.deepEqual(response.statusCode, 200);
  t.deepEqual(response.data.status, 'ok');
  t.deepEqual(response.cookies['health-id'], {
    value: 'generated-token-1234',
    options: {
      httpOnly: true,
    }
  });
});

test.serial(
    '[login-api]: should handle a failure to delete old user token',
    async (t) => {
      t.context.sandbox.stub(fetchModule, 'default').callsFake(() => {
        const fakeGithubResponse = {
          'access_token': 'access-token-1234',
        };
        return {
          json: () => {
            return fakeGithubResponse;
          },
        };
      });

      t.context.sandbox.stub(userModel, 'generateNewUserToken')
          .callsFake((accessToken: string, userScopes: string[]) => {
            t.deepEqual(accessToken, 'access-token-1234');
            t.deepEqual(userScopes, []);
            return 'generated-token-1234';
          });
      t.context.sandbox.stub(userModel, 'deleteUserToken')
          .callsFake(async () => {
            throw new Error('Inject Error.');
          });

      const request = {cookies: {'health-id': 'original-token-1234'}};
      const response = await handleLoginRequest(request as express.Request);
      if (!('data' in response)) {
        throw new Error('Expected data response');
      }
      if (!response.cookies) {
        throw new Error('Expected cookies to be set');
      }
      t.deepEqual(response.statusCode, 200);
      t.deepEqual(response.data.status, 'ok');
      t.deepEqual(response.cookies['health-id'], {
        value: 'generated-token-1234',
        options: {
          httpOnly: true,
        }
      });
    });
