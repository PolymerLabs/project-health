import * as ava from 'ava';

import {startTestReplayServer} from '../../../replay-server';
import {PullRequestReviewState} from '../../../types/gql-types';
import {DashData} from '../../apis/dash-data';

/**
 * Assigns the test context object before each test to ensure it is correctly
 * typed.
 */
function contextualize<T>(getContext: (_: ava.TestContext) => Promise<T>):
    ava.RegisterContextual<T> {
  ava.test.beforeEach(async (t) => {
    Object.assign(t.context, await getContext(t));
  });
  return ava.test;
}

/**
 * Generates the test context object before each test.
 */
const test = contextualize(async (t) => {
  const {server, client} = await startTestReplayServer(t);
  return {
    replayServer: server,
    client,
    dashData: new DashData(client),
    // This token must be set in the environment during recording.
    token: process.env.GITHUB_TOKEN || '',
  };
});

test.afterEach.cb((t) => {
  t.context.replayServer.close(t.end);
});

test('project-health1 dashboard', async (t) => {
  const result = await t.context.dashData.fetchUserData(
      'project-health1', t.context.token);
  t.deepEqual(result, {
    outgoingPrs: [
      // Outgoing PR, changes requested.
      {
        author: 'project-health1',
        avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
        createdAt: 1517253689000,
        repository: 'project-health1/repo',
        reviewRequests: [],
        reviews: [
          {
            author: 'project-health2',
            createdAt: 1517253712000,
            reviewState: PullRequestReviewState.CHANGES_REQUESTED,
          },
        ],
        status: {type:'PendingChanges'},
        title: 'Adding an oauth page',
        url: 'https://github.com/project-health1/repo/pull/6',
      },
      // Outgoing PR, approved, ready to merge.
      {
        author: 'project-health1',
        avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
        createdAt: 1517253583000,
        repository: 'project-health1/repo',
        reviewRequests: [],
        reviews: [
          {
            author: 'project-health2',
            createdAt: 1517253614000,
            reviewState: PullRequestReviewState.APPROVED,
          },
        ],
        status: {type:'PendingMerge'},
        title: 'Add lint for TS files',
        url: 'https://github.com/project-health1/repo/pull/5',
      },
      // Outgoing PR, has 1 commented review.
      {
        author: 'project-health1',
        avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
        createdAt: 1516324726000,
        repository: 'project-health1/repo',
        reviewRequests: [],
        reviews: [
          {
            author: 'project-health2',
            createdAt: 1516324775000,
            reviewState: PullRequestReviewState.COMMENTED,
          },
        ],
        title: 'Update all the things',
        url: 'https://github.com/project-health1/repo/pull/2',
        status: {type:'WaitingReview', reviewers: ['project-health2']},
      },
      // Outgoing PR, requested reviews, no reviews.
      {
        author: 'project-health1',
        avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
        createdAt: 1513370262000,
        repository: 'project-health1/repo',
        reviewRequests: [
          'project-health2',
        ],
        reviews: [],
        title: 'Update README.md',
        url: 'https://github.com/project-health1/repo/pull/1',
        status: {type:'WaitingReview', reviewers: ['project-health2']},
      },
    ],
    incomingPrs: [
      // Incoming review request.
      {
        author: 'project-health2',
        avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
        createdAt: 1516753159000,
        myReview: null,
        repository: 'project-health1/repo',
        title: 'Add a field for getting the template of an element',
        url: 'https://github.com/project-health1/repo/pull/4',
        status: {type:'ReviewRequired'},
      },
      // Incoming PR, I requested changes.
      {
        author: 'project-health2',
        avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
        createdAt: 1516750523000,
        myReview: {
          author: 'project-health1',
          createdAt: 1516753105000,
          reviewState: PullRequestReviewState.CHANGES_REQUESTED,
        },
        repository: 'project-health1/repo',
        title: 'A couple minor changes for browserify compatibility',
        url: 'https://github.com/project-health1/repo/pull/3',
        status: {type:'ApprovalRequired'},
      },
    ]
  });
});
