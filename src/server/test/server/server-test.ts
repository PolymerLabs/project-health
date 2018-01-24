import * as ava from 'ava';

import {DashServer} from '../../dash-server';
import {startTestReplayServer} from '../../../replay-server';
import {PullRequestReviewState} from '../../../types/gql-types';

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
    dash: new DashServer(client, {
      GITHUB_CLIENT_ID: '',
      GITHUB_CLIENT_SECRET: '',
    }),
    // This token must be set in the environment during recording.
    token: process.env.GITHUB_TOKEN || '',
  };
});

test.afterEach.cb((t) => {
  t.context.replayServer.close(t.end);
});

test('basic PR', async (t) => {
  const result =
      await t.context.dash.fetchUserData('project-health1', t.context.token);
  t.deepEqual(result, {
    outgoingPrs: [
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
      },
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
      },
    ],
  });
});
