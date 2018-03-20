import anyTest, {TestInterface} from 'ava';

import {startTestReplayServer} from '../../../replay-server';
import {fetchOutgoingData} from '../../../server/apis/dash-data/fetch-outgoing-data';
import {OutgoingDashResponse, OutgoingPullRequest} from '../../../types/api';
import {MergeableState, PullRequestReviewState} from '../../../types/gql-types';
import {initFirestore} from '../../../utils/firestore';
import {initGithub} from '../../../utils/github';
import {getTestTokens} from '../../get-test-tokens';

type TestContext = {
  data: OutgoingDashResponse,
  prsById: Map<string, OutgoingPullRequest>,
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
});

/**
 * Generates the test context object before test.
 */
test.before(async (t) => {
  const {server, url} =
      await startTestReplayServer(t, 'project-health1-dashboard outgoing');
  initGithub(url, url);

  const loginDetails = {
    username: 'project-health1',
    githubToken: getTestTokens()['project-health1'],
    scopes: [],
    avatarUrl: null,
    fullname: null,
    lastKnownUpdate: new Date().toISOString(),
  };

  const result = await fetchOutgoingData(loginDetails, 'project-health1');
  let page = result;

  while (page.hasMore && page.cursor) {
    page =
        await fetchOutgoingData(loginDetails, 'project-health1', page.cursor);
    result.prs = result.prs.concat(page.prs);
  }

  server.close();

  const prsById = new Map();
  for (const pr of result.prs) {
    prsById.set(pr.url.replace(/https:\/\/github.com\//, ''), pr);
  }

  t.context = {
    data: result,
    prsById,
  };
});

test('dashoutgoing: sane output', (t) => {
  const data = t.context.data;
  // Make sure a test is added each time these numbers are changed.
  t.is(data.prs.length, 11);
});

test('dashoutgoing: outgoing PRs are sorted', (t) => {
  const data = t.context.data;
  let lastCreatedAt = data.prs[0].createdAt;
  for (const pr of data.prs) {
    t.true(pr.createdAt <= lastCreatedAt);
    lastCreatedAt = pr.createdAt;
  }
});

test('dashoutgoing: outgoing PR, review with my own replies', (t) => {
  t.deepEqual(t.context.prsById.get('project-health1/repo/pull/8'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTY2MTM2ODI5',
    author: 'project-health1',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
    createdAt: 1517359006000,
    events: [
      {
        reviews: [{
          author: 'project-health2',
          createdAt: 1517359027000,
          reviewState: PullRequestReviewState.COMMENTED,
        }],
        type: 'OutgoingReviewEvent',
      },
    ],
    number: 8,
    owner: 'project-health1',
    repo: 'repo',
    status: {
      reviewers: ['project-health2'],
      type: 'WaitingReview',
    },
    title: 'Update readme to contain more information',
    url: 'https://github.com/project-health1/repo/pull/8',
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    mergeable: MergeableState.MERGEABLE,
    automergeOpts: null,
    automergeAvailable: false,
  });
});

test('dashoutgoing: Outgoing PR, no reviewers', (t) => {
  t.deepEqual(t.context.prsById.get('project-health1/repo/pull/7'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTY2MTIxMzYx',
    author: 'project-health1',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
    createdAt: 1517353063000,
    events: [],
    number: 7,
    owner: 'project-health1',
    repo: 'repo',
    status: {
      type: 'NoReviewers',
    },
    title: 'Update README.md',
    url: 'https://github.com/project-health1/repo/pull/7',
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    mergeable: MergeableState.MERGEABLE,
    automergeOpts: null,
    automergeAvailable: false,
  });
});

test('dashoutgoing: Outgoing PR, changes requested', (t) => {
  t.deepEqual(t.context.prsById.get('project-health1/repo/pull/6'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTY1NzkzODg3',
    author: 'project-health1',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
    createdAt: 1517253689000,
    number: 6,
    owner: 'project-health1',
    repo: 'repo',
    status: {type: 'PendingChanges'},
    title: 'Adding an oauth page',
    url: 'https://github.com/project-health1/repo/pull/6',
    events: [{
      type: 'OutgoingReviewEvent',
      reviews: [{
        author: 'project-health2',
        createdAt: 1517253712000,
        reviewState: PullRequestReviewState.CHANGES_REQUESTED,
      }],
    }],
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    mergeable: MergeableState.MERGEABLE,
    automergeOpts: null,
    automergeAvailable: false,
  });
});

test('dashoutgoing: Outgoing PR, approved, ready to merge', (t) => {
  t.deepEqual(t.context.prsById.get('project-health1/repo/pull/5'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTY1NzkzNDcx',
    author: 'project-health1',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
    createdAt: 1517253583000,
    number: 5,
    owner: 'project-health1',
    repo: 'repo',
    status: {type: 'PendingMerge'},
    title: 'Add lint for TS files',
    url: 'https://github.com/project-health1/repo/pull/5',
    events: [{
      type: 'OutgoingReviewEvent',
      reviews: [{
        author: 'project-health2',
        createdAt: 1517253614000,
        reviewState: PullRequestReviewState.APPROVED,
      }],
    }],
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    mergeable: MergeableState.MERGEABLE,
    automergeOpts: null,
    automergeAvailable: false,
  });
});

test('dashoutgoing: Outgoing PR, has 1 commented review', (t) => {
  t.deepEqual(t.context.prsById.get('project-health1/repo/pull/2'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTYzODY0NTkz',
    author: 'project-health1',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
    createdAt: 1516324726000,
    number: 2,
    owner: 'project-health1',
    repo: 'repo',
    title: 'Update all the things',
    url: 'https://github.com/project-health1/repo/pull/2',
    status: {type: 'WaitingReview', reviewers: ['project-health2']},
    events: [{
      type: 'OutgoingReviewEvent',
      reviews: [
        {
          author: 'project-health2',
          createdAt: 1516324775000,
          reviewState: PullRequestReviewState.COMMENTED,
        },
      ]
    }],
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    mergeable: MergeableState.MERGEABLE,
    automergeOpts: null,
    automergeAvailable: false,
  });
});

test('dashoutgoing: Outgoing PR, requested reviews, no reviews', (t) => {
  t.deepEqual(t.context.prsById.get('project-health1/repo/pull/1'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTU4Njg4ODg0',
    author: 'project-health1',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
    createdAt: 1513370262000,
    number: 1,
    owner: 'project-health1',
    repo: 'repo',
    title: 'Update README.md',
    url: 'https://github.com/project-health1/repo/pull/1',
    status: {type: 'WaitingReview', reviewers: ['project-health2']},
    events: [],
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    mergeable: MergeableState.MERGEABLE,
    automergeOpts: null,
    automergeAvailable: false,
  });
});


test('dashoutgoing: review requested changes then approved', (t) => {
  t.deepEqual(t.context.prsById.get('project-health1/repo/pull/12'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTcyMTEzODAz',
    author: 'project-health1',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
    createdAt: 1519864550000,
    number: 12,
    owner: 'project-health1',
    repo: 'repo',
    title: 'Controversial changes',
    url: 'https://github.com/project-health1/repo/pull/12',
    status: {type: 'PendingMerge'},
    events: [{
      type: 'OutgoingReviewEvent',
      reviews: [{
        author: 'project-health2',
        createdAt: 1519864611000,
        reviewState: PullRequestReviewState.APPROVED,
      }],
    }],
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    mergeable: MergeableState.MERGEABLE,
    automergeOpts: null,
    automergeAvailable: false,
  });
});

test('dashoutgoing: with success status', (t) => {
  t.deepEqual(t.context.prsById.get('project-health1/status-repo/pull/3'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTc0NDQ3NDAw',
    author: 'project-health1',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
    createdAt: 1520877290000,
    number: 3,
    owner: 'project-health1',
    repo: 'status-repo',
    title: 'Success [status::success]',
    url: 'https://github.com/project-health1/status-repo/pull/3',
    status: {type: 'PendingMerge'},
    events: [{
      type: 'OutgoingReviewEvent',
      reviews: [{
        author: 'project-health2',
        createdAt: 1520878369000,
        reviewState: PullRequestReviewState.APPROVED,
      }],
    }],
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    mergeable: MergeableState.MERGEABLE,
    automergeOpts: null,
    automergeAvailable: false,
  });
});

test('dashoutgoing: with pending status', (t) => {
  t.deepEqual(t.context.prsById.get('project-health1/status-repo/pull/4'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTc0NDQ3NDYz',
    author: 'project-health1',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
    createdAt: 1520877301000,
    number: 4,
    owner: 'project-health1',
    repo: 'status-repo',
    title: 'Pending [status::pending]',
    url: 'https://github.com/project-health1/status-repo/pull/4',
    status: {type: 'StatusChecksPending'},
    events: [{
      type: 'OutgoingReviewEvent',
      reviews: [{
        author: 'project-health2',
        createdAt: 1520878359000,
        reviewState: PullRequestReviewState.APPROVED,
      }],
    }],
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    mergeable: MergeableState.MERGEABLE,
    automergeOpts: null,
    automergeAvailable: true,
  });
});

test('dashoutgoing: with error status', (t) => {
  t.deepEqual(t.context.prsById.get('project-health1/status-repo/pull/5'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTc0NDQ3NTc1',
    author: 'project-health1',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
    createdAt: 1520877324000,
    number: 5,
    owner: 'project-health1',
    repo: 'status-repo',
    title: 'Error [status::error]',
    url: 'https://github.com/project-health1/status-repo/pull/5',
    status: {type: 'StatusChecksFailed'},
    events: [{
      type: 'OutgoingReviewEvent',
      reviews: [{
        author: 'project-health2',
        createdAt: 1520878349000,
        reviewState: PullRequestReviewState.APPROVED,
      }],
    }],
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    mergeable: MergeableState.MERGEABLE,
    automergeOpts: null,
    automergeAvailable: false,
  });
});

test('dashoutgoing: with failing status', (t) => {
  t.deepEqual(t.context.prsById.get('project-health1/status-repo/pull/6'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTc0NDQ3Njk2',
    author: 'project-health1',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
    createdAt: 1520877353000,
    number: 6,
    owner: 'project-health1',
    repo: 'status-repo',
    title: 'Failure [status::failure]',
    url: 'https://github.com/project-health1/status-repo/pull/6',
    status: {type: 'StatusChecksFailed'},
    events: [{
      type: 'OutgoingReviewEvent',
      reviews: [{
        author: 'project-health2',
        createdAt: 1520878339000,
        reviewState: PullRequestReviewState.APPROVED,
      }],
    }],
    repoDetails: {
      allow_rebase_merge: true,
      allow_squash_merge: true,
      allow_merge_commit: true,
    },
    mergeable: MergeableState.MERGEABLE,
    automergeOpts: null,
    automergeAvailable: false,
  });
});
