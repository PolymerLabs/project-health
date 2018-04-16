import anyTest, {TestInterface} from 'ava';
import * as express from 'express';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {PrivateAPIRouter} from '../../../../server/apis/api-router/private-api-router';
import * as responseHelper from '../../../../server/apis/api-router/response-helper';
import {userModel} from '../../../../server/models/userModel';
import {newFakeUserRecord} from '../../../utils/newFakeUserRecord';

type TestContext = {
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

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

test.serial(
    '[private-api-router]: should call post callback with request and user record',
    async (t) => {
      const fakeExpressRouter = {post: () => {}};
      t.context.sandbox.stub(express, 'Router').callsFake(() => {
        return fakeExpressRouter;
      });
      const postSpy = t.context.sandbox.spy(fakeExpressRouter, 'post');

      const fakeUserRecord = newFakeUserRecord();
      t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
          .callsFake(async () => {
            return fakeUserRecord;
          });

      const callbackSpy = t.context.sandbox.spy(async () => {
        return responseHelper.data({
          hello: 'world',
        });
      });
      const privateRouter = new PrivateAPIRouter();
      privateRouter.post('/', callbackSpy);

      t.is(postSpy.callCount, 1, 'express.post() call count');
      t.is(postSpy.args[0][0], '/');

      const fakeRequest = {};
      const fakeResponse = {
        status: () => {
          return fakeResponse;
        },
        json: () => {},
      };

      const statusSpy = t.context.sandbox.spy(fakeResponse, 'status');
      const jsonSpy = t.context.sandbox.spy(fakeResponse, 'json');

      const wrappedCallback = postSpy.args[0][1];
      await wrappedCallback(fakeRequest, fakeResponse);
      t.is(callbackSpy.callCount, 1, 'Callback callcount');
      t.deepEqual(callbackSpy.args[0][0], fakeRequest);
      t.deepEqual(callbackSpy.args[0][1], fakeUserRecord);

      t.is(statusSpy.callCount, 1, 'response.status() callcount');
      t.is(statusSpy.args[0][0], 200, 'response.status() value');
      t.is(jsonSpy.callCount, 1, 'response.json() callcount');
      t.deepEqual(jsonSpy.args[0][0], {
        data: {
          hello: 'world',
        }
      });
    });

test.serial(
    '[private-api-router]: should be an error if no user record was found',
    async (t) => {
      const fakeExpressRouter = {post: () => {}};
      t.context.sandbox.stub(express, 'Router').callsFake(() => {
        return fakeExpressRouter;
      });
      const postSpy = t.context.sandbox.spy(fakeExpressRouter, 'post');

      t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
          .callsFake(async () => {
            return null;
          });

      const callbackSpy = t.context.sandbox.spy(async () => {
        return responseHelper.data({
          hello: 'world',
        });
      });
      const privateRouter = new PrivateAPIRouter();
      privateRouter.post('/', callbackSpy);

      t.is(postSpy.callCount, 1, 'express.post() call count');
      t.is(postSpy.args[0][0], '/');

      const fakeRequest = {};
      const fakeResponse = {
        status: () => {
          return fakeResponse;
        },
        json: () => {},
      };

      const statusSpy = t.context.sandbox.spy(fakeResponse, 'status');
      const jsonSpy = t.context.sandbox.spy(fakeResponse, 'json');

      const wrappedCallback = postSpy.args[0][1];
      await wrappedCallback(fakeRequest, fakeResponse);
      t.is(callbackSpy.callCount, 0, 'Callback callcount');

      t.is(statusSpy.callCount, 1, 'response.status() callcount');
      t.is(statusSpy.args[0][0], 401, 'response.status() value');
      t.is(jsonSpy.callCount, 1, 'response.json() callcount');
      t.is(jsonSpy.args[0][0].error.code, 'not-signed-in');
    });
