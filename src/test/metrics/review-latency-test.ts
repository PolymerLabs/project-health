import test from 'ava';

import {getReviewLatency} from '../../metrics/review-latency';
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
  const result =
      await getReviewLatency(t.context.client, {org: 'WebComponents'});
  t.is(result.totalLatency, 262575635000);
  t.is(result.reviews.length, 684);
});
