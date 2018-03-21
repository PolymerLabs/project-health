import anyTest, {TestInterface} from 'ava';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {HOOK_MAX_AGE, hooksModel} from '../../../server/models/hooksModel';
import {initFirestore} from '../../../utils/firestore';

const TEST_HOOK_STRING = 'a123b456';
const TEST_HOOK_STRING_2 = 'a123b456_2';

type TestContext = {
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
});

test.beforeEach(async (t) => {
  t.context.sandbox = sinon.sandbox.create();
  await hooksModel.deleteHook(TEST_HOOK_STRING);
  await hooksModel.deleteHook(TEST_HOOK_STRING_2);
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
  await hooksModel.deleteHook(TEST_HOOK_STRING);
  await hooksModel.deleteHook(TEST_HOOK_STRING_2);
});

test.serial('[hookModel] should return true for new', async (t) => {
  const value = await hooksModel.logHook(TEST_HOOK_STRING);
  t.deepEqual(value, true);
});

test.serial(
    '[hookModel] should set, get and delete hook details correctly',
    async (t) => {
      let value = await hooksModel.logHook(TEST_HOOK_STRING);
      t.deepEqual(value, true);

      value = await hooksModel.logHook(TEST_HOOK_STRING);
      t.deepEqual(value, false);

      await hooksModel.deleteHook(TEST_HOOK_STRING);

      value = await hooksModel.logHook(TEST_HOOK_STRING);
      t.deepEqual(value, true);
    });

test.serial('[hookModel] should clean old hook details', async (t) => {
  let fakeTime = 0;
  sinon.stub(Date, 'now').callsFake(() => {
    return fakeTime;
  });

  let value = await hooksModel.logHook(TEST_HOOK_STRING);
  t.deepEqual(value, true, 'Hook 1 should be logged');

  fakeTime += HOOK_MAX_AGE + 1;
  value = await hooksModel.logHook(TEST_HOOK_STRING_2);
  t.deepEqual(value, true, 'Hook 2 should be logged');

  await hooksModel.cleanHooks();

  // This should be treated as "old" and removed
  value = await hooksModel.logHook(TEST_HOOK_STRING);
  t.deepEqual(value, true, 'Hook 1 should not be logged after cleaning');

  // This should be treated as new enough to avoid cleaning
  value = await hooksModel.logHook(TEST_HOOK_STRING_2);
  t.deepEqual(value, false, 'Hook 2 should be logged after cleaning');
});
