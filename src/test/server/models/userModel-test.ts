import anyTest, {TestInterface} from 'ava';
import * as crypto from 'crypto';
import * as http from 'http';
import * as sinon from 'sinon';

import {startTestReplayServer} from '../../../replay-server';
import {TOKEN_COLLECTION_NAME, userModel, USERS_COLLECTION_NAME} from '../../../server/models/userModel';
import {firestore, initFirestore} from '../../../utils/firestore';
import * as githubFactory from '../../../utils/github';
import {initGithub} from '../../../utils/github';
import {getTestTokens} from '../../get-test-tokens';

const TEST_USER_TOKEN = 'fake-user-token-abcd';
const TEST_USERNAME = 'fake-username';
const TEST_NAME = 'fake name';
const TEST_AVATAR = 'https://example.com/avatar.png';

type TestContext = {
  sandbox: sinon.SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

let replayServer: http.Server|null = null;
test.before(async (t) => {
  initFirestore();
  const {server, url} = await startTestReplayServer(t, 'userModel-test');
  replayServer = server;
  initGithub(url, url);
});

test.beforeEach(async (t) => {
  await userModel.deleteUserToken(TEST_USER_TOKEN);
  await userModel.deleteUser(TEST_USERNAME);

  t.context.sandbox = sinon.createSandbox();
});

test.afterEach.always(async (t) => {
  await userModel.deleteUserToken(TEST_USER_TOKEN);
  await userModel.deleteUser(TEST_USERNAME);

  t.context.sandbox.restore();
});

test.after(() => {
  if (replayServer) {
    replayServer.close();
  }
});

test.serial('[usermodel]: should return null for no user', async (t) => {
  const result = await userModel.getLoginDetails(TEST_USERNAME);
  t.deepEqual(result, null);
});

test.serial(
    '[usermodel]: should return null for user with no token', async (t) => {
      const exampleData = {
        username: TEST_USER_TOKEN,
        fullname: TEST_NAME,
        avatarUrl: TEST_AVATAR,
        scopes: [],
        lastKnownUpdate: new Date().toISOString(),
      };

      await firestore()
          .collection(USERS_COLLECTION_NAME)
          .doc(TEST_USERNAME)
          .set(exampleData);

      const result = await userModel.getLoginDetails(TEST_USERNAME);
      t.deepEqual(result, null);
    });

test.serial(
    '[usermodel]: should return null for user with no scopes', async (t) => {
      const exampleData = {
        username: TEST_USER_TOKEN,
        fullname: TEST_NAME,
        avatarUrl: TEST_AVATAR,
        githubToken: '1234',
        lastKnownUpdate: new Date().toISOString(),
      };

      await firestore()
          .collection(USERS_COLLECTION_NAME)
          .doc(TEST_USERNAME)
          .set(exampleData);

      const result = await userModel.getLoginDetails(TEST_USERNAME);
      t.deepEqual(result, null);
    });

test.serial(
    '[usermodel]: should return null for user with scopes but missing repo',
    async (t) => {
      const exampleData = {
        username: TEST_USER_TOKEN,
        fullname: TEST_NAME,
        avatarUrl: TEST_AVATAR,
        githubToken: '1234',
        scopes: ['other'],
        lastKnownUpdate: new Date().toISOString(),
      };

      await firestore()
          .collection(USERS_COLLECTION_NAME)
          .doc(TEST_USERNAME)
          .set(exampleData);

      const result = await userModel.getLoginDetails(TEST_USERNAME);
      t.deepEqual(result, null);
    });

test.serial(
    '[usermodel]: should return null for user with no username', async (t) => {
      const exampleData = {
        fullname: TEST_NAME,
        avatarUrl: TEST_AVATAR,
        githubToken: '1234',
        scopes: ['repo'],
        lastKnownUpdate: new Date().toISOString(),
      };

      await firestore()
          .collection(USERS_COLLECTION_NAME)
          .doc(TEST_USERNAME)
          .set(exampleData);

      const result = await userModel.getLoginDetails(TEST_USERNAME);
      t.deepEqual(result, null);
    });

test.serial(
    '[usermodel]: should return null for user with no fullname', async (t) => {
      const exampleData = {
        username: TEST_USERNAME,
        avatarUrl: TEST_AVATAR,
        githubToken: '1234',
        scopes: ['repo'],
        lastKnownUpdate: new Date().toISOString(),
      };

      await firestore()
          .collection(USERS_COLLECTION_NAME)
          .doc(TEST_USERNAME)
          .set(exampleData);

      const result = await userModel.getLoginDetails(TEST_USERNAME);
      t.deepEqual(result, null);
    });

test.serial(
    '[usermodel]: should return null for user with no avatar', async (t) => {
      const exampleData = {
        username: TEST_USERNAME,
        fullname: TEST_NAME,
        githubToken: '1234',
        scopes: ['repo'],
        lastKnownUpdate: new Date().toISOString(),
      };

      await firestore()
          .collection(USERS_COLLECTION_NAME)
          .doc(TEST_USERNAME)
          .set(exampleData);

      const result = await userModel.getLoginDetails(TEST_USERNAME);
      t.deepEqual(result, null);
    });

test.serial(
    '[usermodel]: should return data for existing user with valid data',
    async (t) => {
      const exampleData = {
        username: TEST_USER_TOKEN,
        fullname: TEST_NAME,
        avatarUrl: TEST_AVATAR,
        githubToken: '1234',
        scopes: ['repo'],
        lastKnownUpdate: new Date().toISOString(),
      };

      await firestore()
          .collection(USERS_COLLECTION_NAME)
          .doc(TEST_USERNAME)
          .set(exampleData);

      const result = await userModel.getLoginDetails(TEST_USERNAME);
      t.deepEqual(result, exampleData);
    });

test.serial('[usermodel]: should return a new user token', async (t) => {
  const githubToken = 'fake-github-token';
  const scopes = ['repo', 'test-1', 'test-2'];

  t.context.sandbox.stub(githubFactory, 'github').callsFake(() => {
    return {
      query: ({context}: {context: {token: string}}) => {
        t.deepEqual(context.token, githubToken);
        return {
          data: {
            viewer: {
              login: TEST_USERNAME,
              name: TEST_NAME,
              avatarUrl: TEST_AVATAR,
            }
          }
        };
      }
    };
  });

  t.context.sandbox.stub(crypto, 'randomBytes').callsFake(() => {
    return {
      toString: () => {
        return TEST_USER_TOKEN;
      },
    };
  });

  const newToken = await userModel.generateNewUserToken(githubToken, scopes);
  t.deepEqual(newToken, TEST_USER_TOKEN);

  const result = await userModel.getLoginFromToken(TEST_USER_TOKEN);
  t.deepEqual(result, {
    githubToken,
    username: TEST_USERNAME,
    fullname: TEST_NAME,
    avatarUrl: TEST_AVATAR,
    scopes,
    lastKnownUpdate: null,
  });
});



test.serial('[usermodel]: should return null for no token', async (t) => {
  const result = await userModel.getLoginFromToken(undefined);
  t.deepEqual(result, null);
});

test.serial(
    '[usermodel]: should return null for token that doesnt exit', async (t) => {
      const result = await userModel.getLoginFromToken(TEST_USER_TOKEN);
      t.deepEqual(result, null);
    });

test.serial(
    '[usermodel]: should return null for token that has no username',
    async (t) => {
      await firestore()
          .collection(TOKEN_COLLECTION_NAME)
          .doc(TEST_USER_TOKEN)
          .set({});

      const result = await userModel.getLoginFromToken(TEST_USER_TOKEN);
      t.deepEqual(result, null);
    });

test.serial(
    '[usermodel]: should return null for token that has username but no user info',
    async (t) => {
      await firestore()
          .collection(TOKEN_COLLECTION_NAME)
          .doc(TEST_USER_TOKEN)
          .set({
            username: TEST_USERNAME,
          });

      const result = await userModel.getLoginFromToken(TEST_USER_TOKEN);
      t.deepEqual(result, null);
    });

test.serial(
    '[usermodel]: should throw when creating a new user with no scopes',
    async (t) => {
      await t.throws(async () => {
        await userModel.generateNewUserToken(
            getTestTokens()['project-health1'], []);
      }, 'New user info is invalid.');
    });
