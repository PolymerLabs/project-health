import anyTest, {TestInterface} from 'ava';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {FeatureDetails} from '../../../server/models/userModel';
import {issueHasNewActivity} from '../../../server/utils/issue-has-new-activity';
import {initFirestore} from '../../../utils/firestore';

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
    '[issueHasNewActivity]: should handle no feature details', async (t) => {
      const activity = await issueHasNewActivity(null, 0, null);
      t.deepEqual(activity, false, 'issue has activity');
    });

test.serial(
    '[issueHasNewActivity]: should use feature enabled at instead of user last viewed',
    async (t) => {
      const fakeDetails = {
        enabledAt: 2,
      };

      const activity = await issueHasNewActivity(fakeDetails, 1, 0);
      t.deepEqual(activity, false, 'issue has activity');
    });

test.serial(
    '[issueHasNewActivity]: should use last viewed if more recent than feature enabled',
    async (t) => {
      const fakeDetails: FeatureDetails = {
        enabledAt: 0,
      };

      const activity = await issueHasNewActivity(fakeDetails, 1, 2);
      t.deepEqual(activity, false, 'issue has activity');
    });

test.serial(
    '[issueHasNewActivity]: should mark as new entry when its timestamp is great than last viewed',
    async (t) => {
      const fakeDetails: FeatureDetails = {
        enabledAt: 0,
      };
      const activity = await issueHasNewActivity(fakeDetails, 2, 1);
      t.deepEqual(activity, true, 'issue has activity');
    });
