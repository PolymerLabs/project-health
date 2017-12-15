import * as ava from 'ava';

import {DashServer} from '../../server';
import {startTestReplayServer} from '../replay-server';

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
    dash: new DashServer(client),
    // This token must be set in the environment during recording.
    token: process.env.GITHUB_TOKEN || '',
  };
});

test.afterEach.cb((t) => {
  t.context.replayServer.close(t.end);
});

test('basic PR', async (t) => {
  const result = await t.context.dash.fetchUserData(t.context.token);
  t.deepEqual(result, {
    prs: [{
      repository: 'project-health1/repo',
      title: 'Update README.md',
      number: 1,
      avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
      approvedBy: [],
      changesRequestedBy: [],
      commentedBy: [],
      pendingReviews: [],
      statusState: 'passed'
    }]
  });
});
