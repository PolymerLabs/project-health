import test from 'ava';

import {pullRequestsModel} from '../../../server/models/pullRequestsModel';
import {initFirestore} from '../../../utils/firestore';

const TEST_PR_ID = -1;
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

test.serial('should return null for no commits', async (t) => {
  const value = await pullRequestsModel.getCommitDetails(
      TEST_PR_ID,
      TEST_COMMIT_ID.toString(),
  );
  t.deepEqual(value, null);
});

test.serial('should set, get and delete commit details', async (t) => {
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
    throw new Error('Value must exists.');
  }
  t.deepEqual(value.status, 'pending');

  await pullRequestsModel.deletePR(TEST_PR_ID);

  value = await pullRequestsModel.getCommitDetails(
      TEST_PR_ID,
      TEST_COMMIT_ID.toString(),
  );
  t.deepEqual(value, null);
});
