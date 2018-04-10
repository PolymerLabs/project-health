import anyTest, {TestInterface} from 'ava';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {performAutomerge} from '../../../server/utils/perform-automerge';
import {initFirestore} from '../../../utils/firestore';
import {github, initGithub} from '../../../utils/github';
import {newFakePullRequestDetails} from '../../utils/newFakePRDetails';

type TestContext = {
  sandbox: SinonSandbox
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
  initGithub();
});

test.beforeEach(async (t) => {
  t.context.sandbox = sinon.sandbox.create();
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
});

test.serial(
    '[performAutomerge]: should attempt merge and not delete if no headref',
    async (t) => {
      const githubInstance = github();
      const putStub =
          t.context.sandbox.stub(githubInstance, 'put').callsFake(() => {});
      const deleteStub =
          t.context.sandbox.stub(githubInstance, 'delete').callsFake(() => {});

      const details = newFakePullRequestDetails();
      delete details.headRef;

      await performAutomerge('github-token-1234', details, 'squash');

      t.deepEqual(putStub.callCount, 1, 'github().put call count');
      t.deepEqual(deleteStub.callCount, 0, 'github().delete call count');

      t.deepEqual(
          putStub.args[0][0],
          'repos/test-owner/test-repo/pulls/1/merge',
          'github().put() URL');
      t.deepEqual(
          putStub.args[0][1],
          'github-token-1234',
          'github().put() github token');
      t.deepEqual(
          putStub.args[0][2],
          {
            commit_title: 'test-title',
            commit_message: 'test-body',
            sha: 'test-commit-SHA',
            merge_method: 'squash'
          },
          'github().put() github parameters');
    });

test.serial(
    '[performAutomerge]: should attempt merge and not delete if head refs is not refs/heads/',
    async (t) => {
      const githubInstance = github();
      const putStub =
          t.context.sandbox.stub(githubInstance, 'put').callsFake(() => {});
      const deleteStub =
          t.context.sandbox.stub(githubInstance, 'delete').callsFake(() => {});

      const details = newFakePullRequestDetails();
      if (details.headRef) {
        details.headRef.prefix = 'refs/remotes/';
      }

      await performAutomerge('github-token-1234', details, 'squash');

      t.deepEqual(putStub.callCount, 1, 'github().put call count');
      t.deepEqual(deleteStub.callCount, 0, 'github().delete call count');
    });

test.serial(
    '[performAutomerge]: should attempt merge and delete if head refs is refs/heads/',
    async (t) => {
      const githubInstance = github();
      const putStub =
          t.context.sandbox.stub(githubInstance, 'put').callsFake(() => {});
      const deleteStub =
          t.context.sandbox.stub(githubInstance, 'delete').callsFake(() => {});

      const details = newFakePullRequestDetails();

      await performAutomerge('github-token-1234', details, 'squash');

      t.deepEqual(putStub.callCount, 1, 'github().put call count');
      t.deepEqual(deleteStub.callCount, 1, 'github().delete call count');
      t.deepEqual(
          deleteStub.args[0][0],
          'repos/test-owner/test-repo/git/refs/heads/branch-name',
          'github().delete() github url');
      t.deepEqual(
          deleteStub.args[0][1],
          'github-token-1234',
          'github().delete() github token');
    });
