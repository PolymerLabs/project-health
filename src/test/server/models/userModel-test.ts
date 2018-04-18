import anyTest, {TestInterface} from 'ava';
import * as crypto from 'crypto';
import * as http from 'http';
import * as sinon from 'sinon';

import {REQUIRED_SCOPES, TOKEN_COLLECTION_NAME, userModel, USERS_COLLECTION_NAME} from '../../../server/models/userModel';
import {firestore, initFirestore} from '../../../utils/firestore';
import * as githubFactory from '../../../utils/github';
import {initGithub} from '../../../utils/github';
import {getTestTokens} from '../../get-test-tokens';
import {FAKE_USERNAME, newFakeUserRecord} from '../../utils/newFakeUserRecord';
import {startTestReplayServer} from '../../utils/replay-server';

const TEST_USER_TOKEN = 'fake-user-token-abcd';

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
  await userModel.deleteUser(FAKE_USERNAME);

  t.context.sandbox = sinon.createSandbox();
});

test.afterEach.always(async (t) => {
  await userModel.deleteUserToken(TEST_USER_TOKEN);
  await userModel.deleteUser(FAKE_USERNAME);

  t.context.sandbox.restore();
});

test.after(() => {
  if (replayServer) {
    replayServer.close();
  }
});

test.serial('[usermodel]: should return null for no user', async (t) => {
  const result = await userModel.getUserRecord(FAKE_USERNAME);
  t.deepEqual(result, null);
});

test.serial(
    '[usermodel]: should return null for user with no token', async (t) => {
      const exampleRecord = newFakeUserRecord();
      delete exampleRecord.githubToken;

      await firestore()
          .collection(USERS_COLLECTION_NAME)
          .doc(exampleRecord.username)
          .set(exampleRecord);

      const result = await userModel.getUserRecord(exampleRecord.username);
      t.deepEqual(result, null);
    });

test.serial(
    '[usermodel]: should return null for user with no scopes', async (t) => {
      const exampleRecord = newFakeUserRecord();
      delete exampleRecord.scopes;

      await firestore()
          .collection(USERS_COLLECTION_NAME)
          .doc(exampleRecord.username)
          .set(exampleRecord);

      const result = await userModel.getUserRecord(exampleRecord.username);
      t.deepEqual(result, null);
    });

test.serial(
    '[usermodel]: should return null for user with scopes but missing repo',
    async (t) => {
      const exampleRecord = newFakeUserRecord();
      exampleRecord.scopes = ['other'];

      await firestore()
          .collection(USERS_COLLECTION_NAME)
          .doc(exampleRecord.username)
          .set(exampleRecord);

      const result = await userModel.getUserRecord(exampleRecord.username);
      t.deepEqual(result, null);
    });

test.serial(
    '[usermodel]: should return null for user with no username', async (t) => {
      const exampleRecord = newFakeUserRecord();
      delete exampleRecord.username;

      await firestore()
          .collection(USERS_COLLECTION_NAME)
          .doc(FAKE_USERNAME)
          .set(exampleRecord);

      const result = await userModel.getUserRecord(FAKE_USERNAME);
      t.deepEqual(result, null);
    });

test.serial(
    '[usermodel]: should return null for user with featureLastViewed',
    async (t) => {
      const exampleRecord = newFakeUserRecord();
      delete exampleRecord.featureLastViewed;

      await firestore()
          .collection(USERS_COLLECTION_NAME)
          .doc(exampleRecord.username)
          .set(exampleRecord);

      const result = await userModel.getUserRecord(exampleRecord.username);
      t.deepEqual(result, null);
    });

test.serial(
    '[usermodel]: should return data for existing user with valid data',
    async (t) => {
      const exampleRecord = newFakeUserRecord();

      await firestore()
          .collection(USERS_COLLECTION_NAME)
          .doc(exampleRecord.username)
          .set(exampleRecord);

      const result = await userModel.getUserRecord(exampleRecord.username);
      t.deepEqual(result, exampleRecord);
    });

test.serial('[usermodel]: should return a new user token', async (t) => {
  // This ensures enabledAt is the same
  t.context.sandbox.useFakeTimers();

  const exampleRecord = newFakeUserRecord();

  t.context.sandbox.stub(githubFactory, 'github').callsFake(() => {
    return {
      query: ({context}: {context: {token: string}}) => {
        t.deepEqual(context.token, exampleRecord.githubToken);
        return {
          data: {
            viewer: {
              login: exampleRecord.username,
              name: exampleRecord.fullname,
              avatarUrl: exampleRecord.avatarUrl,
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

  const newToken = await userModel.generateNewUserToken(
      exampleRecord.githubToken, exampleRecord.scopes);
  t.deepEqual(newToken, TEST_USER_TOKEN);

  const result = await userModel.getUserRecordFromToken(TEST_USER_TOKEN);
  t.deepEqual(result, exampleRecord);
});

test.serial(
    '[usermodel]: should update token details and maintain stored values',
    async (t) => {
      // This ensures enabledAt is the same
      const fakeTimer = t.context.sandbox.useFakeTimers();

      let githubQueryCount = 0;
      t.context.sandbox.stub(githubFactory, 'github').callsFake(() => {
        return {
          query: () => {
            githubQueryCount++;
            return {
              data: {
                viewer: {
                  login: 'example-login',
                  name: `example-name-${githubQueryCount}`,
                  avatarUrl: `https://example-avatar-url/${githubQueryCount}`,
                }
              }
            };
          }
        };
      });

      const FIRST_TOKEN = 'first-token';
      const SECOND_TOKEN = 'second-token';
      t.context.sandbox.stub(crypto, 'randomBytes')
          .onFirstCall()
          .callsFake(() => {
            return {
              toString: () => {
                return FIRST_TOKEN;
              },
            };
          })
          .onSecondCall()
          .callsFake(() => {
            return {
              toString: () => {
                return SECOND_TOKEN;
              },
            };
          });

      const firstToken = await userModel.generateNewUserToken(
          'github-token-1', [...REQUIRED_SCOPES, 'scope-1']);
      t.deepEqual(firstToken, FIRST_TOKEN);

      userModel.markUserForUpdate('example-login');
      fakeTimer.tick(1000);

      const secondToken = await userModel.generateNewUserToken(
          'github-token-2', [...REQUIRED_SCOPES, 'scope-2']);
      t.deepEqual(secondToken, SECOND_TOKEN);

      const result = await userModel.getUserRecordFromToken(SECOND_TOKEN);
      if (!result) {
        throw new Error('Expected a valid user record');
      }
      t.is(result.username, 'example-login');
      t.is(result.githubToken, 'github-token-2');
      t.deepEqual(result.scopes, [...REQUIRED_SCOPES, 'scope-2']);
      t.is(result.fullname, 'example-name-2');
      t.is(result.avatarUrl, 'https://example-avatar-url/2');
      t.deepEqual(result.featureLastViewed, {enabledAt: 0});
      t.truthy(result.lastKnownUpdate);
    });

test.serial('[usermodel]: should return null for no token', async (t) => {
  const result = await userModel.getUserRecordFromToken(undefined);
  t.deepEqual(result, null);
});

test.serial(
    '[usermodel]: should return null for token that doesnt exit', async (t) => {
      const result = await userModel.getUserRecordFromToken(TEST_USER_TOKEN);
      t.deepEqual(result, null);
    });

test.serial(
    '[usermodel]: should return null for token that has no username',
    async (t) => {
      await firestore()
          .collection(TOKEN_COLLECTION_NAME)
          .doc(TEST_USER_TOKEN)
          .set({});

      const result = await userModel.getUserRecordFromToken(TEST_USER_TOKEN);
      t.deepEqual(result, null);
    });

test.serial(
    '[usermodel]: should return null for token that has username but no user info',
    async (t) => {
      await firestore()
          .collection(TOKEN_COLLECTION_NAME)
          .doc(TEST_USER_TOKEN)
          .set({
            username: FAKE_USERNAME,
          });

      const result = await userModel.getUserRecordFromToken(TEST_USER_TOKEN);
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

test.serial('[usermodel]: should mark user for update', async (t) => {
  const doc =
      await firestore().collection(USERS_COLLECTION_NAME).doc('example-user');
  await doc.create({});
  await userModel.markUserForUpdate('example-user');
  const snapshot = await doc.get();
  const data = snapshot.data();
  if (!data) {
    throw new Error('Data should exist');
  }
  t.truthy(data.lastKnownUpdate);
});

test.serial(
    '[usermodel]: should *not* mark user for update if they don\'t exist',
    async (t) => {
      await userModel.markUserForUpdate('example-user-2');
      const doc = await firestore()
                      .collection(USERS_COLLECTION_NAME)
                      .doc('example-user-2');
      const snapshot = await doc.get();
      const data = snapshot.data();
      t.deepEqual(data, null);
    });

test.serial(
    '[usermodel]: should set and get last viewed timestamp', async (t) => {
      let value = await userModel.getAllLastViewedInfo('example-user');
      t.deepEqual(value, {});
      await userModel.updateLastViewed('example-user', 'test-issue-id', 1);
      value = await userModel.getAllLastViewedInfo('example-user');
      t.deepEqual(value['test-issue-id'], 1);
    });

test.serial('[usermodel]: should update last viewed timestamp', async (t) => {
  await userModel.updateLastViewed('example-user', 'test-issue-id', 1);
  await userModel.updateLastViewed('example-user', 'test-issue-id', 2);
  const value = await userModel.getAllLastViewedInfo('example-user');
  t.deepEqual(value['test-issue-id'], 2);
});

test.serial('[usermodel]: should update a users repos', async (t) => {
  const doc =
      await firestore().collection(USERS_COLLECTION_NAME).doc('repos-user');
  await doc.create({});
  const fakeRepo = {owner: 'owner', name: 'name', avatarUrl: 'avatar'};
  await userModel.updateRepos('repos-user', [fakeRepo]);
  const snapshot = await doc.get();
  const data = snapshot.data();
  if (!data) {
    throw new Error('Data should exist');
  }
  t.deepEqual(data.repos, [fakeRepo]);
});
