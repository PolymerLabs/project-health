import test from 'ava';

import {getStars} from '../../metrics/stars';
import {startTestReplayServer} from '../replay-server';

test.beforeEach(async (t) => {
  const {server, client} = await startTestReplayServer(t);
  t.context.server = server;
  t.context.client = client;
});

test.afterEach.cb((t) => {
  t.context.server.close(t.end);
});

test('WebComponents stars', async (t) => {
  const result =
      await getStars(t.context.client, {org: 'WebComponents'});
  t.is(result.stars.length, 6144);
});

test('WebComponents/webcomponents.org stars', async (t) => {
  const result = await getStars(
      t.context.client, {org: 'WebComponents', repo: 'webcomponents.org'});
  t.is(result.stars.length, 127);
});
