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

test.serial('should return true for new', async (t) => {
  const value = await hooksModel.logHook(TEST_HOOK_STRING);
  t.deepEqual(value, true);
});

test.serial('should set, get and delete hook details correctly', async (t) => {
  let value = await hooksModel.logHook(TEST_HOOK_STRING);
  t.deepEqual(value, true);

  value = await hooksModel.logHook(TEST_HOOK_STRING);
  t.deepEqual(value, false);

  await hooksModel.deleteHook(TEST_HOOK_STRING);

  value = await hooksModel.logHook(TEST_HOOK_STRING);
  t.deepEqual(value, true);
});

test.serial('should clean old hook details', async (t) => {
  let fakeTime = 0;
  sinon.stub(Date, 'now').callsFake(() => {
    return fakeTime;
  });

  let value = await hooksModel.logHook(TEST_HOOK_STRING);
  t.deepEqual(value, true);

  fakeTime += HOOK_MAX_AGE + 1;
  value = await hooksModel.logHook(TEST_HOOK_STRING_2);
  t.deepEqual(value, true);

  await hooksModel.cleanHooks();

  // This should be treated as "old" and removed
  value = await hooksModel.logHook(TEST_HOOK_STRING);
  t.deepEqual(value, true);

  // This should be treated as new enough to avoid cleaning
  value = await hooksModel.logHook(TEST_HOOK_STRING_2);
  t.deepEqual(value, false);
});
