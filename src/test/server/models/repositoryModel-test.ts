import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {startTestReplayServer} from '../../../replay-server';
import {MAX_CACHE_AGE, repositoryModel} from '../../../server/models/repositoryModel';
import {initFirestore} from '../../../utils/firestore';
import {github, initGithub} from '../../../utils/github';
import {getTestTokens} from '../../get-test-tokens';

type TestContext = {
  server: Server,
  sandbox: SinonSandbox
};

const REPO_OWNER = 'polymerlabs';
const REPO_NAME = 'project-health';

const LOGIN_DETAILS = {
  username: 'gauntface',
  avatarUrl: null,
  fullname: null,
  githubToken: getTestTokens()['project-health1'],
  scopes: ['repo'],
  lastKnownUpdate: null,
};

const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
});

test.beforeEach(async (t) => {
  const {server, url} = await startTestReplayServer(t);
  t.context.server = server;
  t.context.sandbox = sinon.sandbox.create();
  initGithub(url, url);

  await repositoryModel.deleteRepository(REPO_OWNER, REPO_NAME);
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
  await new Promise((resolve) => t.context.server.close(resolve));
  await repositoryModel.deleteRepository(REPO_OWNER, REPO_NAME);
});

test.serial('getRepositoryDetails when not in Firestore', async (t) => {
  const repoDetails = await repositoryModel.getRepositoryDetails(
      LOGIN_DETAILS, REPO_OWNER, REPO_NAME);

  t.true(repoDetails.allow_rebase_merge);
  t.true(repoDetails.allow_squash_merge);
  t.false(repoDetails.allow_merge_commit);
});

test.serial('getRepositoryDetails when stashed in Firestore', async (t) => {
  const githubInstance = github();
  const githubGetSpy = t.context.sandbox.spy(githubInstance, 'get');

  let repoDetails = await repositoryModel.getRepositoryDetails(
      LOGIN_DETAILS, REPO_OWNER, REPO_NAME);
  t.true(repoDetails.allow_rebase_merge);
  t.true(repoDetails.allow_squash_merge);
  t.false(repoDetails.allow_merge_commit);

  repoDetails = await repositoryModel.getRepositoryDetails(
      LOGIN_DETAILS, REPO_OWNER, REPO_NAME);
  t.true(repoDetails.allow_rebase_merge);
  t.true(repoDetails.allow_squash_merge);
  t.false(repoDetails.allow_merge_commit);

  t.deepEqual(githubGetSpy.callCount, 1);
});

test.serial('getRepositoryDetails should not use old data', async (t) => {
  let currentTime = Date.now() - MAX_CACHE_AGE;
  const githubInstance = github();
  const githubGetSpy = t.context.sandbox.spy(githubInstance, 'get');
  t.context.sandbox.stub(Date, 'now').callsFake(() => {
    return currentTime;
  });

  let repoDetails = await repositoryModel.getRepositoryDetails(
      LOGIN_DETAILS, REPO_OWNER, REPO_NAME);
  t.true(repoDetails.allow_rebase_merge);
  t.true(repoDetails.allow_squash_merge);
  t.false(repoDetails.allow_merge_commit);

  currentTime += MAX_CACHE_AGE + 1;

  repoDetails = await repositoryModel.getRepositoryDetails(
      LOGIN_DETAILS, REPO_OWNER, REPO_NAME);
  t.true(repoDetails.allow_rebase_merge);
  t.true(repoDetails.allow_squash_merge);
  t.false(repoDetails.allow_merge_commit);

  t.deepEqual(githubGetSpy.callCount, 2);
});
