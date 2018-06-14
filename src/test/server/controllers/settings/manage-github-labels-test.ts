import anyTest, {TestInterface} from 'ava';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {addLabels, deleteLabels, Label, LABEL_DESCRIPTION_SUFFIX, LABEL_NAME_PREFIX} from '../../../../server/controllers/settings/manage-github-labels';
import {GithubRepo} from '../../../../server/models/githubAppModel';
import {github, initGithub} from '../../../../utils/github';

type TestContext = {
  sandbox: SinonSandbox,
  post: sinon.SinonStub,
  delete: sinon.SinonStub,
  patch: sinon.SinonStub,
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  // Ensure network is not hit.
  initGithub('', '');
});

test.beforeEach((t) => {
  const sandbox = sinon.sandbox.create();
  t.context = {
    sandbox,
    delete: sandbox.stub(github(), 'delete').callsFake(() => Promise.resolve()),
    post: sandbox.stub(github(), 'post').callsFake(() => Promise.resolve()),
    patch: sandbox.stub(github(), 'patch').callsFake(() => Promise.resolve()),
  };
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
});

const fakeGitHubRepo: GithubRepo = {
  name: 'name',
  nameWithOwner: 'owner/name',
  databaseId: 123,
  id: 'id',
};

const prefix = '[manage-github-labels]: ';

test.serial(`${prefix} should delete non-existing labels`, async (t) => {
  t.context.sandbox.stub(github(), 'get').callsFake(() => {
    return {json: async () => []};
  });
  const labels: Label[] = [
    {name: 'my-label', description: 'my description', color: 'red'},
    {name: 'my-label2', description: 'my description', color: 'blue'},
  ];
  await deleteLabels('', fakeGitHubRepo, labels);

  t.true(t.context.post.notCalled);
  t.true(t.context.patch.notCalled);
  t.true(t.context.delete.notCalled);
});

test.serial(`${prefix} should delete existing labels`, async (t) => {
  t.context.sandbox.stub(github(), 'get').callsFake(() => {
    return {json: async () => [{name: `${LABEL_NAME_PREFIX} my-label`}]};
  });
  const labels: Label[] = [
    {name: 'my-label', description: 'my description', color: 'red'},
    {name: 'my-label2', description: 'my description', color: 'blue'},
  ];
  await deleteLabels('', fakeGitHubRepo, labels);

  t.true(t.context.post.notCalled);
  t.true(t.context.patch.notCalled);
  t.is(t.context.delete.callCount, 1);
});

test.serial(`${prefix} should add labels`, async (t) => {
  t.context.sandbox.stub(github(), 'get').callsFake(() => {
    return {json: async () => []};
  });
  const labels: Label[] = [
    {name: 'my-label', description: 'my description', color: 'red'},
    {name: 'my-label2', description: 'my description', color: 'blue'},
  ];
  await addLabels('', fakeGitHubRepo, labels);

  t.is(t.context.post.callCount, 2);
  t.true(t.context.patch.notCalled);
  t.true(t.context.delete.notCalled);
});

test.serial(`${prefix} should update existing labels`, async (t) => {
  t.context.sandbox.stub(github(), 'get').callsFake(() => {
    return {json: async () => [{name: `${LABEL_NAME_PREFIX} my-label`}]};
  });
  const labels: Label[] = [
    {name: 'my-label', description: 'my description', color: 'red'},
    {name: 'my-label2', description: 'my description', color: 'blue'},
  ];
  await addLabels('', fakeGitHubRepo, labels);

  t.is(t.context.post.callCount, 1);
  t.is(t.context.patch.callCount, 1);
  t.true(t.context.delete.notCalled);
});

test.serial(`${prefix} should not touch existing labels`, async (t) => {
  t.context.sandbox.stub(github(), 'get').callsFake(() => {
    return {
      json: async () => [{
        name: `${LABEL_NAME_PREFIX} my-label`,
        description: `my description ${LABEL_DESCRIPTION_SUFFIX}`,
        color: 'red',
      }]
    };
  });
  const labels: Label[] = [
    {name: 'my-label', description: 'my description', color: 'red'},
    {name: 'my-label2', description: 'my description', color: 'blue'},
  ];
  await addLabels('', fakeGitHubRepo, labels);

  t.is(t.context.post.callCount, 1);
  t.true(t.context.patch.notCalled);
  t.true(t.context.delete.notCalled);
});
