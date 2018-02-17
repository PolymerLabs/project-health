import test from 'ava';
import * as crypto from 'crypto';
import * as sinon from 'sinon';

import {TOKEN_COLLECTION_NAME, userModel, USERS_COLLECTION_NAME} from '../../../server/models/userModel';
import {firestore, initFirestore} from '../../../utils/firestore';
import * as githubFactory from '../../../utils/github';

const TEST_USER_TOKEN = 'fake-user-token-abcd';
const TEST_USERNAME = 'fake-username';

test.before(() => {
  initFirestore();
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

test.serial('should return null for no user', async (t) => {
  const result = await userModel.getLoginDetails(TEST_USERNAME);
  t.deepEqual(result, null);
});

test.serial('should return data for existing user', async (t) => {
  const exampleData = {
    username: TEST_USER_TOKEN,
    githubToken: '1234',
    scopes: [],
  };

  await firestore()
      .collection(USERS_COLLECTION_NAME)
      .doc(TEST_USERNAME)
      .set(exampleData);

  const result = await userModel.getLoginDetails(TEST_USERNAME);
  t.deepEqual(result, exampleData);
});

test.serial('should return a new user token', async (t) => {
  const githubToken = 'fake-github-token';
  const scopes = ['test-1', 'test-2'];

  t.context.sandbox.stub(githubFactory, 'github').callsFake(() => {
    return {
      query: ({context}: {context: {githubToken: string}}) => {
        t.deepEqual(context.githubToken, githubToken);
        return {
          data: {
            viewer: {
              login: TEST_USERNAME,
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

  const userDoc = await firestore()
                      .collection(USERS_COLLECTION_NAME)
                      .doc(TEST_USERNAME)
                      .get();
  t.deepEqual(userDoc.data(), {
    githubToken,
    username: TEST_USERNAME,
    scopes,
  });

  const tokenDoc = await firestore()
                       .collection(TOKEN_COLLECTION_NAME)
                       .doc(TEST_USER_TOKEN)
                       .get();
  const data = tokenDoc.data();
  if (!data) {
    t.fail();
    return;
  }

  t.deepEqual(data.username, TEST_USERNAME);

  const result = await userModel.getLoginFromToken(TEST_USER_TOKEN);
  t.deepEqual(result, {
    githubToken: TEST_USER_TOKEN,
    username: TEST_USERNAME,
    scopes,
  });
});

test.serial('should return null for no token', async (t) => {
  const result = await userModel.getLoginFromToken(undefined);
  t.deepEqual(result, null);
});

test.serial('should return null for token that doesnt exit', async (t) => {
  const result = await userModel.getLoginFromToken(TEST_USER_TOKEN);
  t.deepEqual(result, null);
});

test.serial('should return null for token that has no username', async (t) => {
  await firestore()
      .collection(TOKEN_COLLECTION_NAME)
      .doc(TEST_USER_TOKEN)
      .set({});

  const result = await userModel.getLoginFromToken(TEST_USER_TOKEN);
  t.deepEqual(result, null);
});

test.serial(
    'should return null for token that has username but no user info',
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
