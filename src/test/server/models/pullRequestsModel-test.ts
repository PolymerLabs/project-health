import test from 'ava';

import {pullRequestsModel} from '../../../server/models/pullRequestsModel';
import {initFirestore} from '../../../utils/firestore';

const TEST_PR_ID = '-1';
const TEST_COMMIT_ID = 123456;

test.before(() => {
  initFirestore();
});

test.beforeEach(async () => {
  await pullRequestsModel.deletePR(TEST_PR_ID);
});

test.afterEach.always(async () => {
  await pullRequestsModel.deletePR(TEST_PR_ID);
});

test.serial(
    '[pullRequestsModel] should return null for no commits', async (t) => {
      const value = await pullRequestsModel.getCommitDetails(
          TEST_PR_ID,
          TEST_COMMIT_ID.toString(),
      );
      t.deepEqual(value, null);
    });

test.serial(
    '[pullRequestsModel] should set, get and delete commit details',
    async (t) => {
      await pullRequestsModel.setCommitStatus(
          TEST_PR_ID,
          TEST_COMMIT_ID.toString(),
          'pending',
      );

      let value = await pullRequestsModel.getCommitDetails(
          TEST_PR_ID,
          TEST_COMMIT_ID.toString(),
      );
      if (!value) {
        throw new Error('Value must exist.');
      }
      t.deepEqual(value.status, 'pending');

      await pullRequestsModel.deletePR(TEST_PR_ID);

      value = await pullRequestsModel.getCommitDetails(
          TEST_PR_ID,
          TEST_COMMIT_ID.toString(),
      );
      t.deepEqual(value, null);
    });

test.serial(
    '[pullRequestsModel] should return null if request a commit that doesnt exist for a PR',
    async (t) => {
      await pullRequestsModel.setCommitStatus(
          TEST_PR_ID,
          TEST_COMMIT_ID.toString(),
          'pending',
      );

      const value = await pullRequestsModel.getCommitDetails(
          TEST_PR_ID,
          '1111111',
      );
      t.deepEqual(value, null);

      await pullRequestsModel.deletePR(TEST_PR_ID);
    });

test.serial('[pullRequestsModel] should update commit details', async (t) => {
  await pullRequestsModel.setCommitStatus(
      TEST_PR_ID,
      TEST_COMMIT_ID.toString(),
      'pending',
  );

  await pullRequestsModel.setCommitStatus(
      TEST_PR_ID,
      TEST_COMMIT_ID.toString(),
      'error',
  );

  const value = await pullRequestsModel.getCommitDetails(
      TEST_PR_ID,
      TEST_COMMIT_ID.toString(),
  );
  if (!value) {
    throw new Error('value must exist.');
  }
  t.deepEqual(value.status, 'error');
});

test.serial(
    '[pullRequestsModel] should return null for no PR', async (t) => {
      const value = await pullRequestsModel.getAutomergeOpts(TEST_PR_ID);
      t.deepEqual(value, null);
    });

test.serial(
    '[pullRequestsModel] should return null for PR with no automerge opts',
    async (t) => {
      await pullRequestsModel.setCommitStatus(
          TEST_PR_ID,
          TEST_COMMIT_ID.toString(),
          'pending',
      );

      const value = await pullRequestsModel.getAutomergeOpts(TEST_PR_ID);
      t.deepEqual(value, null);
    });

test.serial(
    '[pullRequestsModel] should be able to set and get auto merge opts',
    async (t) => {
      await pullRequestsModel.setAutomergeOptions(
          TEST_PR_ID,
          'manual',
      );

      const value = await pullRequestsModel.getAutomergeOpts(TEST_PR_ID);
      if (!value) {
        throw new Error('Value must exist.');
      }
      t.deepEqual(value.mergeType, 'manual');
    });

test.serial(
    '[pullRequestsModel] should add auto merge opts to existing PR',
    async (t) => {
      await pullRequestsModel.setCommitStatus(
          TEST_PR_ID,
          TEST_COMMIT_ID.toString(),
          'pending',
      );

      await pullRequestsModel.setAutomergeOptions(
          TEST_PR_ID,
          'manual',
      );

      const automergeValue =
          await pullRequestsModel.getAutomergeOpts(TEST_PR_ID);
      if (!automergeValue) {
        throw new Error('automergeValue must exist.');
      }
      t.deepEqual(automergeValue.mergeType, 'manual');

      const commitDetails = await pullRequestsModel.getCommitDetails(
          TEST_PR_ID, TEST_COMMIT_ID.toString());
      if (!commitDetails) {
        throw new Error('commitDetails must exist.');
      }
      t.deepEqual(commitDetails.status, 'pending');
    });

test.serial('[pullRequestsModel] should update automerge opts', async (t) => {
  await pullRequestsModel.setAutomergeOptions(
      TEST_PR_ID,
      'manual',
  );

  let value = await pullRequestsModel.getAutomergeOpts(TEST_PR_ID);
  if (!value) {
    throw new Error('Value must exist.');
  }
  t.deepEqual(value.mergeType, 'manual');

  await pullRequestsModel.setAutomergeOptions(
      TEST_PR_ID,
      'rebase',
  );

  value = await pullRequestsModel.getAutomergeOpts(TEST_PR_ID);
  if (!value) {
    throw new Error('Value must exist.');
  }
  t.deepEqual(value.mergeType, 'rebase');
});
