import anyTest, {TestInterface} from 'ava';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {userModel, UserRecord} from '../../../server/models/userModel';
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
    '[issueHasNewActivity]: should return false when no user record',
    async (t) => {
      const activity = await issueHasNewActivity('example-username', 0, 1);
      t.deepEqual(activity, false, 'issue has activity');
    });

test.serial(
    '[issueHasNewActivity]: should set last used feature when its undefined',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        const fakeRecord: UserRecord = {
          githubToken: 'test-token',
          scopes: [],
          username: '',
          fullname: '',
          avatarUrl: '',
          lastKnownUpdate: '',
        };
        return fakeRecord;
      });
      const setFeatureSpy = t.context.sandbox.spy(userModel, 'setFeatureData');

      const activity = await issueHasNewActivity('example-username', 0, null);
      t.deepEqual(activity, false, 'issue has activity');
      t.deepEqual(setFeatureSpy.callCount, 1, 'setFeature should be called');
      t.deepEqual(
          setFeatureSpy.args[0][0],
          'example-username',
          'setFeature called for username');
      t.deepEqual(
          setFeatureSpy.args[0][1], 'featureLastViewed', 'Expected feature ID');
      t.truthy(setFeatureSpy.args[0][2]);
      t.truthy(setFeatureSpy.args[0][2].enabledAt);
    });

test.serial(
    '[issueHasNewActivity]: should not set last used feature when its defined',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        const fakeRecord: UserRecord = {
          githubToken: 'test-token',
          scopes: [],
          username: '',
          fullname: '',
          avatarUrl: '',
          lastKnownUpdate: '',
          featureLastViewed: {
            enabledAt: 1,
          }
        };
        return fakeRecord;
      });
      const setFeatureSpy = t.context.sandbox.spy(userModel, 'setFeatureData');

      const activity = await issueHasNewActivity('example-username', 0, null);
      t.deepEqual(activity, false, 'issue has activity');
      t.deepEqual(setFeatureSpy.callCount, 0, 'setFeature should be called');
    });

test.serial(
    '[issueHasNewActivity]: should use feature enabled at instead of user last viewed',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        const fakeRecord: UserRecord = {
          githubToken: 'test-token',
          scopes: [],
          username: '',
          fullname: '',
          avatarUrl: '',
          lastKnownUpdate: '',
          featureLastViewed: {
            enabledAt: 2,
          }
        };
        return fakeRecord;
      });

      const activity = await issueHasNewActivity('example-username', 1, 0);
      t.deepEqual(activity, false, 'issue has activity');
    });

test.serial(
    '[issueHasNewActivity]: should use last viewed if more recent than feature enabled',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        const fakeRecord: UserRecord = {
          githubToken: 'test-token',
          scopes: [],
          username: '',
          fullname: '',
          avatarUrl: '',
          lastKnownUpdate: '',
          featureLastViewed: {
            enabledAt: 0,
          }
        };
        return fakeRecord;
      });

      const activity = await issueHasNewActivity('example-username', 1, 2);
      t.deepEqual(activity, false, 'issue has activity');
    });

test.serial(
    '[issueHasNewActivity]: should mark as new entry when its timestamp is great than last viewed',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecord').callsFake(() => {
        const fakeRecord: UserRecord = {
          githubToken: 'test-token',
          scopes: [],
          username: '',
          fullname: '',
          avatarUrl: '',
          lastKnownUpdate: '',
          featureLastViewed: {
            enabledAt: 0,
          }
        };
        return fakeRecord;
      });

      const activity = await issueHasNewActivity('example-username', 2, 1);
      t.deepEqual(activity, true, 'issue has activity');
    });
