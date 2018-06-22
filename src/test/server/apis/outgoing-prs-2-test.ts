import anyTest, {TestInterface} from 'ava';

import {handleOutgoingPRRequest} from '../../../server/apis/dash-data/handle-outgoing-pr-request';
import {OutgoingDashResponse, OutgoingPullRequest} from '../../../types/api';
import {PullRequestReviewState} from '../../../types/gql-types';
import {initFirestore} from '../../../utils/firestore';
import {initGithub} from '../../../utils/github';
import {newFakeRequest} from '../../utils/newFakeRequest';
import {newFakeUserRecord} from '../../utils/newFakeUserRecord';
import {startTestReplayServer} from '../../utils/replay-server';

type TestContext = {
  data: OutgoingDashResponse,
  prsById: Map<string, OutgoingPullRequest>,
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
});

/**
 * Generates the test context object before each test.
 */
test.beforeEach(async (t) => {
  const {server, url} =
      await startTestReplayServer(t, 'project-health2-dashboard outgoing');
  initGithub(url, url);

  const userRecord = newFakeUserRecord();
  userRecord.username = 'project-health2';
  const reponse = await handleOutgoingPRRequest(newFakeRequest(), userRecord);
  server.close();

  const prsById = new Map();
  for (const pr of reponse.data.prs) {
    prsById.set(
        pr.url.replace('https://github.com/project-health1/repo/pull/', ''),
        pr);
  }
  t.context = {
    data: reponse.data,
    prsById,
  };
});

test('[outgoing-prs-2]: sane output', (t) => {
  const data = t.context.data;
  // Make sure a test is added each time these numbers are changed.
  t.is(data.prs.length, 8);
});

test('[outgoing-prs-2]: outgoing PRs are sorted', (t) => {
  const data = t.context.data;
  let lastCreatedAt = data.prs[0].createdAt;
  for (const pr of data.prs) {
    t.true(pr.createdAt <= lastCreatedAt);
    lastCreatedAt = pr.createdAt;
  }
});

test('[outgoing-prs-2]: requested changes', (t) => {
  t.deepEqual(t.context.prsById.get('14'), {
    author: 'project-health2',
    automergeSelection: null,
    automergeAvailable: false,
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
    createdAt: 1520881768000,
    events: [
      {
        reviews: [{
          author: 'project-health1',
          createdAt: 1520881787000,
          reviewState: PullRequestReviewState.CHANGES_REQUESTED,
        }],
        type: 'OutgoingReviewEvent',
      },
    ],
    id: 'MDExOlB1bGxSZXF1ZXN0MTc0NDY2NTk5',
    mergeable: 'MERGEABLE',
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    number: 14,
    owner: 'project-health1',
    repo: 'repo',
    status: {
      type: 'PendingChanges',
    },
    title: 'Modify readme description',
    url: 'https://github.com/project-health1/repo/pull/14',
    hasNewActivity: false,
  });
});

test('[outgoing-prs-2]: review with comments', (t) => {
  t.deepEqual(t.context.prsById.get('13'), {
    author: 'project-health2',
    automergeSelection: null,
    automergeAvailable: false,
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
    createdAt: 1520468329000,
    events: [
      {
        reviews: [{
          author: 'project-health1',
          createdAt: 1520468379000,
          reviewState: PullRequestReviewState.COMMENTED,
        }],
        type: 'OutgoingReviewEvent',
      },
    ],
    id: 'MDExOlB1bGxSZXF1ZXN0MTczNjExNzIw',
    mergeable: 'MERGEABLE',
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    number: 13,
    owner: 'project-health1',
    repo: 'repo',
    status: {
      reviewers: [
        'project-health1',
      ],
      type: 'WaitingReview',
    },
    title: 'My changes to readme',
    url: 'https://github.com/project-health1/repo/pull/13',
    hasNewActivity: false,
  });
});

test('[outgoing-prs-2]: review with comments2', (t) => {
  t.deepEqual(t.context.prsById.get('11'), {
    author: 'project-health2',
    automergeSelection: null,
    automergeAvailable: false,
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
    createdAt: 1518042329000,
    events: [
      {
        reviews: [{
          author: 'project-health1',
          createdAt: 1518042376000,
          reviewState: PullRequestReviewState.COMMENTED,
        }],
        type: 'OutgoingReviewEvent',
      },
    ],
    id: 'MDExOlB1bGxSZXF1ZXN0MTY3ODI2Mzk1',
    mergeable: 'MERGEABLE',
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    number: 11,
    owner: 'project-health1',
    repo: 'repo',
    status: {
      reviewers: [
        'project-health1',
      ],
      type: 'WaitingReview',
    },
    title: 'A new pull request',
    url: 'https://github.com/project-health1/repo/pull/11',
    hasNewActivity: false,
  });
});

test('[outgoing-prs-2]: ready to merge', (t) => {
  t.deepEqual(t.context.prsById.get('10'), {
    author: 'project-health2',
    automergeSelection: null,
    automergeAvailable: false,
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
    createdAt: 1518031465000,
    events: [
      {
        reviews: [{
          author: 'project-health1',
          createdAt: 1518031566000,
          reviewState: PullRequestReviewState.APPROVED,
        }],
        type: 'OutgoingReviewEvent',
      },
    ],
    id: 'MDExOlB1bGxSZXF1ZXN0MTY3Nzg1NjAw',
    mergeable: 'MERGEABLE',
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    number: 10,
    owner: 'project-health1',
    repo: 'repo',
    status: {
      type: 'PendingMerge',
    },
    title: 'Questionable changes',
    url: 'https://github.com/project-health1/repo/pull/10',
    hasNewActivity: false,
  });
});

test('[outgoing-prs-2]: changes requested, new commit', (t) => {
  t.deepEqual(t.context.prsById.get('9'), {
    author: 'project-health2',
    automergeSelection: null,
    automergeAvailable: false,
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
    createdAt: 1517426339000,
    events: [
      {
        reviews: [{
          author: 'project-health1',
          createdAt: 1517426375000,
          reviewState: PullRequestReviewState.CHANGES_REQUESTED,
        }],
        type: 'OutgoingReviewEvent',
      },
    ],
    id: 'MDExOlB1bGxSZXF1ZXN0MTY2MzUxNTky',
    mergeable: 'MERGEABLE',
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    number: 9,
    owner: 'project-health1',
    repo: 'repo',
    status: {
      reviewers: ['project-health1'],
      type: 'WaitingReview',
    },
    title: 'Update links in readme',
    url: 'https://github.com/project-health1/repo/pull/9',
    hasNewActivity: false,
  });
});

test('[outgoing-prs-2]: no review', (t) => {
  t.deepEqual(t.context.prsById.get('4'), {
    author: 'project-health2',
    automergeSelection: null,
    automergeAvailable: false,
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
    createdAt: 1516753159000,
    events: [],
    id: 'MDExOlB1bGxSZXF1ZXN0MTY0NzI1NzUw',
    mergeable: 'MERGEABLE',
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    number: 4,
    owner: 'project-health1',
    repo: 'repo',
    status: {
      reviewers: ['project-health1'],
      type: 'WaitingReview',
    },
    title: 'Add a field for getting the template of an element',
    url: 'https://github.com/project-health1/repo/pull/4',
    hasNewActivity: false,
  });
});

test('[outgoing-prs-2]: basic requested changes', (t) => {
  t.deepEqual(t.context.prsById.get('3'), {
    author: 'project-health2',
    automergeSelection: null,
    automergeAvailable: false,
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
    createdAt: 1516750523000,
    events: [
      {
        reviews: [{
          author: 'project-health1',
          createdAt: 1516753105000,
          reviewState: PullRequestReviewState.CHANGES_REQUESTED,
        }],
        type: 'OutgoingReviewEvent',
      },
    ],
    id: 'MDExOlB1bGxSZXF1ZXN0MTY0NzE5MzU4',
    mergeable: 'MERGEABLE',
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    number: 3,
    owner: 'project-health1',
    repo: 'repo',
    status: {
      type: 'PendingChanges',
    },
    title: 'A couple minor changes for browserify compatibility',
    url: 'https://github.com/project-health1/repo/pull/3',
    hasNewActivity: false,
  });
});

test('[outgoing-prs-2]: outgoing PR with pending review', (t) => {
  t.deepEqual(t.context.prsById.get('19'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTg2Nzg2MzE0',
    author: 'project-health2',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
    createdAt: 1525824148000,
    events: [],
    number: 19,
    owner: 'project-health1',
    repo: 'repo',
    status: {
      reviewers: ['project-health1'],
      type: 'WaitingReview',
    },
    title: 'Pending review',
    url: 'https://github.com/project-health1/repo/pull/19',
    hasNewActivity: false,
    automergeSelection: null,
    automergeAvailable: false,
    mergeable: 'MERGEABLE',
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
  });
});
