import {test} from 'ava';

import {DashServer} from '../../server';
import {startTestReplayServer} from '../replay-server';

test.beforeEach(async (t) => {
  const {server, client} = await startTestReplayServer(t);
  t.context.replayServer = server;
  t.context.client = client;
  t.context.dash = new DashServer(client);
});

test.afterEach.cb((t) => {
  t.context.replayServer.close(t.end);
});

test('basic PR', async (t) => {
  const result = await t.context.dash.fetchUserData(
      '652e551588c3ca5e0b3ad7ffe4a3752c41d53a10');
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
