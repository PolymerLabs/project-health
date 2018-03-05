import anyTest, {TestInterface} from 'ava';

import {startTestReplayServer} from '../../../replay-server';
import {fetchOutgoingData} from '../../../server/apis/dash-data';
import {OutgoingDashResponse, OutgoingPullRequest} from '../../../types/api';
import {MergeableState, PullRequestReviewState} from '../../../types/gql-types';
import {initFirestore} from '../../../utils/firestore';
import {initGithub} from '../../../utils/github';

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
      await startTestReplayServer(t, 'project-health1-dashboard outgoing');
  initGithub(url, url);

  const loginDetails = {
    username: 'project-health1',
    githubToken: 'test-token',
    scopes: [],
    avatarUrl: null,
    fullname: null,
    lastKnownUpdate: new Date().toISOString(),
  };
  const data = await fetchOutgoingData(
      loginDetails, 'project-health1', process.env.GITHUB_TOKEN || '');
  server.close();

  const prsById = new Map();
  for (const pr of data.prs) {
    prsById.set(
        pr.url.replace('https://github.com/project-health1/repo/pull/', ''),
        pr);
  }
  t.context = {
    data,
    prsById,
  };
});

test('dashoutgoing: sane output', (t) => {
  const data = t.context.data;
  // Make sure a test is added each time these numbers are changed.
  t.is(data.prs.length, 7);
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
  t.deepEqual(t.context.prsById.get('8'), {
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
    repository: 'project-health1/repo',
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
  });
});

test('dashoutgoing: Outgoing PR, no reviewers', (t) => {
  t.deepEqual(t.context.prsById.get('7'), {
    author: 'project-health1',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
    createdAt: 1517353063000,
    events: [],
    repository: 'project-health1/repo',
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
  });
});

test('dashoutgoing: Outgoing PR, changes requested', (t) => {
  t.deepEqual(t.context.prsById.get('6'), {
    author: 'project-health1',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
    createdAt: 1517253689000,
    repository: 'project-health1/repo',
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
  });
});

test('dashoutgoing: Outgoing PR, approved, ready to merge', (t) => {
  t.deepEqual(t.context.prsById.get('5'), {
    author: 'project-health1',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
    createdAt: 1517253583000,
    repository: 'project-health1/repo',
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
  });
});

test('dashoutgoing: Outgoing PR, has 1 commented review', (t) => {
  t.deepEqual(t.context.prsById.get('2'), {
    author: 'project-health1',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
    createdAt: 1516324726000,
    repository: 'project-health1/repo',
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
  });
});

test('dashoutgoing: Outgoing PR, requested reviews, no reviews', (t) => {
  t.deepEqual(t.context.prsById.get('1'), {
    author: 'project-health1',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
    createdAt: 1513370262000,
    repository: 'project-health1/repo',
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
  });
});


test('dashoutgoing: review requested changes then approved', (t) => {
  t.deepEqual(t.context.prsById.get('12'), {
    author: 'project-health1',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
    createdAt: 1519864550000,
    repository: 'project-health1/repo',
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
  });
});
