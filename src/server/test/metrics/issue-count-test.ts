import test from 'ava';

import {getIssueCounts} from '../../../cli/metrics/issue-counts';
import {startTestReplayServer} from '../../../replay-server';

test.beforeEach(async (t) => {
  const {server, client} = await startTestReplayServer(t);
  t.context.server = server;
  t.context.client = client;
});

test.afterEach.cb((t) => {
  t.context.server.close(t.end);
});

test('WebComponents issue count', async (t) => {
  const result = await getIssueCounts(t.context.client, {org: 'WebComponents'});
  t.is(result.issues.length, 1599);
  t.truthy(result.summary());
  t.truthy(result.rawData());
  // TODO Test time series by writing out golden.
});
