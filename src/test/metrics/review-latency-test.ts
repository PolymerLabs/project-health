import test from 'ava';

import reviewLatency from '../../metrics/review-latency';
import {startTestReplayServer} from '../replay-server';

test.beforeEach(async (t) => {
  const {server, client} = await startTestReplayServer(t);
  t.context.server = server;
  t.context.client = client;
});

test.afterEach.cb((t) => {
  t.context.server.close(t.end);
});

test('WebComponents review latency', async (t) => {
  const latency =
      await reviewLatency(t.context.client, {org: 'WebComponents', raw: false});
  t.is(latency, 262575635000);
});
