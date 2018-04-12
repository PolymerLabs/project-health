import anyTest, {TestInterface} from 'ava';
import * as express from 'express';
import * as fetchModule from 'node-fetch';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {handlePRCheckState} from '../../../server/apis/check-pr-state';
import {initFirestore} from '../../../utils/firestore';
import {github, initGithub} from '../../../utils/github';
import {initSecrets} from '../../../utils/secrets';
import {newFakeSecrets} from '../../utils/newFakeSecrets';
import {newFakeUserRecord} from '../../utils/newFakeUserRecord';

type TestContext = {
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
  initGithub();
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

test.serial('[check-pr-state-api]: should handle no PR IDs', async (t) => {
  const response = await handlePRCheckState(
      {body: []} as express.Request, newFakeUserRecord());
  if (!('data' in response)) {
    throw new Error('Expected data response');
  }
  t.deepEqual(response.data.pullRequests, []);
});

test.serial(
    '[check-pr-state-api]: should handle github response', async (t) => {
      t.context.sandbox.stub(fetchModule, 'default').callsFake(() => {
        const fakeGithubResponse = {error: 'Injected error.'};
        return {
          json: () => {
            return fakeGithubResponse;
          },
        };
      });

      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query').callsFake(() => {
        return {
          data: {
            nodes: [
              null,
              {
                __typename: 'not-a-pullrequest',
              },
              {
                __typename: 'PullRequest',
                id: '456',
                state: 'OPEN',
              }
            ],
          }
        };
      });

      const response = await handlePRCheckState(
          {body: ['123']} as express.Request, newFakeUserRecord());
      if (!('data' in response)) {
        throw new Error('Expected data response');
      }
      t.deepEqual(response.data.pullRequests, [{
                    gqlId: '456',
                    state: 'OPEN',
                  }]);
    });
