import anyTest, {TestInterface} from 'ava';
import * as express from 'express';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {handleRemoveRepo, handleUserRequest} from '../../../server/apis/user';
import {userModel} from '../../../server/models/userModel';
import * as myRepos from '../../../server/utils/my-repos';
import * as api from '../../../types/api';
import {initFirestore} from '../../../utils/firestore';
import {initGithub} from '../../../utils/github';
import {initSecrets} from '../../../utils/secrets';
import {newFakeSecrets} from '../../utils/newFakeSecrets';
import {newFakeUserRecord} from '../../utils/newFakeUserRecord';

type TestContext = {
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
  initGithub();
  initSecrets(newFakeSecrets());
});

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

test.serial('[user-api]: should return what my-repos returns', async (t) => {
  t.context.sandbox.stub(myRepos, 'generateMyRepoList').callsFake(() => {
    return [{name: 'name', owner: 'owner'}] as api.Repository[];
  });

  const response =
      await handleUserRequest({} as express.Request, newFakeUserRecord());
  if (!('data' in response)) {
    throw new Error('Expected data response');
  }
  t.deepEqual(response.data, {
    avatarUrl: 'https://avatars2.githubusercontent.com/u/34584679?s=400&v=4',
    login: 'fake-username',
    repos: [{name: 'name', owner: 'owner'}],
  });
});

test.serial('[user-api]: remove repo', async (t) => {
  const repos: api.Repository[] = [
    {owner: 'owner', name: 'repo', avatarUrl: null},
    {owner: 'fakeOwner', name: 'fakeRepo', avatarUrl: null},
  ];
  const fakeUserRecord = Object.assign(newFakeUserRecord(), {repos});
  const updateReposSpy = t.context.sandbox.spy(userModel, 'updateRepos');

  // Remove repo.
  const response = await handleRemoveRepo(
      {body: {owner: 'owner', repo: 'repo'}} as express.Request,
      fakeUserRecord);
  if (!('data' in response)) {
    throw new Error('Expected data response');
  }
  t.is(response.statusCode, 200);

  t.is(updateReposSpy.callCount, 1);
  t.true(updateReposSpy.calledWith(
      'fake-username',
      [{name: 'fakeRepo', owner: 'fakeOwner', avatarUrl: null}]));
});
