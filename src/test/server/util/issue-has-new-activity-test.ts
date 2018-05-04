import anyTest, {TestInterface} from 'ava';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {issueHasNewActivity} from '../../../server/utils/issue-has-new-activity';
import {initFirestore} from '../../../utils/firestore';
import {newFakeUserRecord} from '../../utils/newFakeUserRecord';

type TestContext = {
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
});

test.beforeEach(async (t) => {
  t.context = {
    sandbox: sinon.sandbox.create(),
  };
});

test.afterEach((t) => {
  t.context.sandbox.restore();
});

test.serial(
    '[issueHasNewActivity]: should use feature enabled at instead of user last viewed',
    async (t) => {
      const userRecord = newFakeUserRecord();
      userRecord.featureLastViewed.enabledAt = 2;

      const activity = await issueHasNewActivity(userRecord, 1, 0);
      t.deepEqual(activity, false, 'issue has activity');
    });

test.serial(
    '[issueHasNewActivity]: should use last viewed if more recent than feature enabled',
    async (t) => {
      const userRecord = newFakeUserRecord();
      userRecord.featureLastViewed.enabledAt = 0;

      const activity = await issueHasNewActivity(userRecord, 1, 2);
      t.deepEqual(activity, false, 'issue has activity');
    });

test.serial(
    '[issueHasNewActivity]: should mark as new entry when its timestamp is greater than last viewed',
    async (t) => {
      const userRecord = newFakeUserRecord();
      userRecord.featureLastViewed.enabledAt = 0;

      const activity = await issueHasNewActivity(userRecord, 2, 1);
      t.deepEqual(activity, true, 'issue has activity');
    });
