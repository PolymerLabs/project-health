import anyTest, {TestInterface} from 'ava';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {settingsModel} from '../../../server/models/settingsModel';
import {initFirestore} from '../../../utils/firestore';

type TestContext = {
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
});

test.beforeEach(async (t) => {
  t.context.sandbox = sinon.sandbox.create();
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
});

test('[settingsModel]: should return null for non-existant org', async (t) => {
  const result = await settingsModel.getOrgSettings('example-org');
  t.is(result, null, 'Org Settings');
});

test('[settingsModel]: should set and return org settings', async (t) => {
  await settingsModel.setOrgSettings(
      'example-org', '{"hello": "world"}', 'example-user');

  const result = await settingsModel.getOrgSettings('example-org');
  if (!result) {
    throw new Error('Expected settings.');
  }
  t.deepEqual(result.editors, ['example-user'], 'Settings Editors');
  t.is(result.fileContents, '{"hello": "world"}', 'Org Settings');
});

test(
    '[settingsModel]: should update org settings and add editors',
    async (t) => {
      await settingsModel.setOrgSettings(
          'example-org-2', '{"hello": "world"}', 'example-user');

      await settingsModel.setOrgSettings(
          'example-org-2', '{"hello": "world1"}', 'example-user');

      await settingsModel.setOrgSettings(
          'example-org-2', '{"hello": "world2"}', 'example-user-2');

      const result = await settingsModel.getOrgSettings('example-org-2');
      if (!result) {
        throw new Error('Expected settings.');
      }
      t.deepEqual(
          result.editors,
          ['example-user', 'example-user-2'],
          'Settings Editors');
      t.is(result.fileContents, '{"hello": "world2"}', 'Org Settings');
    });

test(
    '[settingsModel]: should throw when attempting to save non-JSON data',
    async (t) => {
      const promise = settingsModel.setOrgSettings(
          'example-org', 'This is not JSON - eek', 'example-user');

      await t.throws(promise);
    });
