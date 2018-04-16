import anyTest, {TestInterface} from 'ava';
import * as express from 'express';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {PublicAPIRouter} from '../../../../server/apis/api-router/public-api-router';
import * as responseHelper from '../../../../server/apis/api-router/response-helper';

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
    '[public-api-router]: should call post callback with request',
    async (t) => {
      const fakeExpressRouter = {post: () => {}};
      t.context.sandbox.stub(express, 'Router').callsFake(() => {
        return fakeExpressRouter;
      });
      const postSpy = t.context.sandbox.spy(fakeExpressRouter, 'post');

      const callback = async () => {
        return responseHelper.data({
          hello: 'world',
        });
      };
      const publicRouter = new PublicAPIRouter();
      publicRouter.post('/', callback);

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
    '[public-api-router]: should do nothing if headers are already sent',
    async (t) => {
      const fakeExpressRouter = {get: () => {}};
      t.context.sandbox.stub(express, 'Router').callsFake(() => {
        return fakeExpressRouter;
      });
      const getSpy = t.context.sandbox.spy(fakeExpressRouter, 'get');

      const callbackSpy = t.context.sandbox.spy(async () => {
        return responseHelper.data({
          hello: 'world',
        });
      });

      const publicRouter = new PublicAPIRouter();
      publicRouter.get('/', callbackSpy);

      t.is(getSpy.callCount, 1, 'express.get() call count');
      t.is(getSpy.args[0][0], '/');

      const fakeRequest = {};
      const fakeResponse = {
        headersSent: true,
        status: () => {
          return fakeResponse;
        },
        json: () => {},
      };

      const statusSpy = t.context.sandbox.spy(fakeResponse, 'status');
      const jsonSpy = t.context.sandbox.spy(fakeResponse, 'json');

      const wrappedCallback = getSpy.args[0][1];
      await wrappedCallback(fakeRequest, fakeResponse);

      t.is(statusSpy.callCount, 0, 'response.status() callcount');
      t.is(jsonSpy.callCount, 0, 'response.json() callcount');
      t.is(callbackSpy.callCount, 0, 'callback count spy');
    });

test.serial(
    '[public-api-router]: enforce request body if required', async (t) => {
      const fakeExpressRouter = {post: () => {}};
      t.context.sandbox.stub(express, 'Router').callsFake(() => {
        return fakeExpressRouter;
      });
      const postSpy = t.context.sandbox.spy(fakeExpressRouter, 'post');

      const callback = async () => {
        return responseHelper.data({
          hello: 'world',
        });
      };
      const publicRouter = new PublicAPIRouter();
      publicRouter.post('/', callback, {
        requireBody: true,
      });

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

      t.is(statusSpy.callCount, 1, 'response.status() callcount');
      t.is(statusSpy.args[0][0], 400, 'response.status() value');
      t.is(jsonSpy.callCount, 1, 'response.json() callcount');
      t.deepEqual(jsonSpy.args[0][0], {
        error: {
          code: 'no-body',
          message: 'You must provide a request body for this API.'
        }
      });
    });

test.serial('[public-api-router]: should handle uncaught errors', async (t) => {
  const fakeExpressRouter = {post: () => {}};
  t.context.sandbox.stub(express, 'Router').callsFake(() => {
    return fakeExpressRouter;
  });
  const postSpy = t.context.sandbox.spy(fakeExpressRouter, 'post');

  const callback = async () => {
    throw new Error('Injected error.');
  };
  const publicRouter = new PublicAPIRouter();
  publicRouter.post('/', callback);

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

  t.is(statusSpy.callCount, 1, 'response.status() callcount');
  t.is(statusSpy.args[0][0], 400, 'response.status() value');
  t.is(jsonSpy.callCount, 1, 'response.json() callcount');
  t.is(jsonSpy.args[0][0].error.code, 'uncaught-exception');
});

test.serial('[public-api-router]: should add cookies', async (t) => {
  const fakeExpressRouter = {post: () => {}};
  t.context.sandbox.stub(express, 'Router').callsFake(() => {
    return fakeExpressRouter;
  });
  const postSpy = t.context.sandbox.spy(fakeExpressRouter, 'post');

  const callback = async () => {
    return {
      statusCode: 200,
      data: {
        hello: 'world',
      },
      cookies: {
        test: {value: 'cookie-test', options: {}},
      }
    };
  };
  const publicRouter = new PublicAPIRouter();
  publicRouter.post('/', callback);

  t.is(postSpy.callCount, 1, 'express.post() call count');
  t.is(postSpy.args[0][0], '/');

  const fakeRequest = {};
  const fakeResponse = {
    status: () => {
      return fakeResponse;
    },
    json: () => {},
    cookie: () => {},
  };

  const statusSpy = t.context.sandbox.spy(fakeResponse, 'status');
  const jsonSpy = t.context.sandbox.spy(fakeResponse, 'json');
  const cookiesSpy = t.context.sandbox.spy(fakeResponse, 'cookie');

  const wrappedCallback = postSpy.args[0][1];
  await wrappedCallback(fakeRequest, fakeResponse);

  t.is(statusSpy.callCount, 1, 'response.status() callcount');
  t.is(statusSpy.args[0][0], 200, 'response.status() value');
  t.is(cookiesSpy.callCount, 1, 'response.cookie() callcount');
  t.is(cookiesSpy.args[0][0], 'test');
  t.is(cookiesSpy.args[0][1], 'cookie-test');
  t.deepEqual(cookiesSpy.args[0][2], {}, 'response.cookie options');
  t.is(jsonSpy.callCount, 1, 'response.json() callcount');
  t.deepEqual(jsonSpy.args[0][0], {
    data: {
      hello: 'world',
    }
  });
});
