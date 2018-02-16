import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';

import {startTestReplayServer} from '../../../replay-server';
import {DashData} from '../../../server/apis/dash-data';
import {PullRequestReviewState} from '../../../types/gql-types';
import {initGithub} from '../../../utils/github';
import { DashResponse } from '../../../types/api';

type TestContext = {
  dashData: DashResponse,
};
const test = anyTest as TestInterface<TestContext>;

/**
 * Generates the test context object before each test.
 */
test.beforeEach(async (t) => {
  const {server, url} =
      await startTestReplayServer(t);
  initGithub(url, url);

  const instance = new DashData();
  const dashData = await instance.fetchUserData(
      'project-health1', process.env.GITHUB_TOKEN || '');
  server.close();
  return {dashData};
});

test('project-health1 dashboard - sane output', (t) => {
  const data = t.context.dashData;
  t.is(data.incomingPrs.length, 5);
  t.is(data.outgoingPrs.length, 6);
});

test('project-health1 dashboard - outgoing PRs are sorted', (t) => {
  const data = t.context.dashData;
  let lastCreatedAt = data.outgoingPrs[0].createdAt;
  data.outgoingPrs.forEach((pr) => {
    t.true(pr.createdAt <= lastCreatedAt);
    lastCreatedAt = pr.createdAt;
  });
});

test('project-health1 dashboard', async (t) => {
  t.deepEqual(t.context.dashData, {
    outgoingPrs: [
      // Outgoing PR, review with my own replies.
      {
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
      },
      // Outgoing PR, no reviewers.
      {
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
      },
      // Outgoing PR, changes requested.
      {
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
      },
      // Outgoing PR, approved, ready to merge.
      {
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
      },
      // Outgoing PR, has 1 commented review.
      {
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
      },
      // Outgoing PR, requested reviews, no reviews.
      {
        author: 'project-health1',
        avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
        createdAt: 1513370262000,
        repository: 'project-health1/repo',
        title: 'Update README.md',
        url: 'https://github.com/project-health1/repo/pull/1',
        status: {type: 'WaitingReview', reviewers: ['project-health2']},
        events: [],
      },
    ],
    incomingPrs: [
      // Incoming PR with old @mention before I reviewed.
      {
        author: 'project-health2',
        avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
        createdAt: 1518042329000,
        events: [
          {
            review: {
              author: 'project-health1',
              createdAt: 1518042373000,
              reviewState: PullRequestReviewState.COMMENTED,
            },
            type: 'MyReviewEvent',
          },
        ],
        repository: 'project-health1/repo',
        status: {
          type: 'ApprovalRequired',
        },
        title: 'A new pull request',
        url: 'https://github.com/project-health1/repo/pull/11',
      },
      // Incoming PR with new @mention after I reviewed.
      {
        author: 'project-health2',
        avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
        createdAt: 1518031465000,
        events: [
          {
            review: {
              author: 'project-health1',
              createdAt: 1518031560000,
              reviewState: PullRequestReviewState.APPROVED,
            },
            type: 'MyReviewEvent',
          },
          {
            type: 'MentionedEvent',
            text: '@project-health1 what do you mean?',
            mentionedAt: 1518031578000,
            url:
                'https://github.com/project-health1/repo/pull/10#discussion_r166728166',
          }
        ],
        repository: 'project-health1/repo',
        status: {
          type: 'NoActionRequired',
        },
        title: 'Questionable changes',
        url: 'https://github.com/project-health1/repo/pull/10',
      },
      // Incoming PR that I reviewed. New commit since.
      {
        author: 'project-health2',
        avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
        createdAt: 1517426339000,
        events: [
          {
            review: {
              author: 'project-health1',
              createdAt: 1517426369000,
              reviewState: PullRequestReviewState.CHANGES_REQUESTED,
            },
            type: 'MyReviewEvent',
          },
          {
            type: 'NewCommitsEvent',
            count: 1,
            additions: 1,
            deletions: 1,
            changedFiles: 1,
            lastPushedAt: 1517426401000,
            url:
                'https://github.com/project-health1/repo/pull/9/files/4eb760bbbeb1e9b5ee51010050fca4d1f2fe5dbb..bf67264ad3d77fcd9ad43cfcc13c8578fb9f57de',
          }
        ],
        repository: 'project-health1/repo',
        status: {
          type: 'ApprovalRequired',
        },
        title: 'Update links in readme',
        url: 'https://github.com/project-health1/repo/pull/9',
      },
      // Incoming PR, I requested changes.
      {
        author: 'project-health2',
        avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
        createdAt: 1516750523000,
        repository: 'project-health1/repo',
        title: 'A couple minor changes for browserify compatibility',
        url: 'https://github.com/project-health1/repo/pull/3',
        status: {type: 'ApprovalRequired'},
        events: [{
          type: 'MyReviewEvent',
          review: {
            author: 'project-health1',
            createdAt: 1516753105000,
            reviewState: PullRequestReviewState.CHANGES_REQUESTED,
          }
        }],
      },
      // Incoming review request.
      {
        author: 'project-health2',
        avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
        createdAt: 1516753159000,
        repository: 'project-health1/repo',
        title: 'Add a field for getting the template of an element',
        url: 'https://github.com/project-health1/repo/pull/4',
        status: {type: 'ReviewRequired'},
        events: [],
      },
    ]
  });
});
