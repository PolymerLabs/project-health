import test from 'ava';

import {getStars} from '../../../cli/metrics/stars';
import {startTestReplayServer} from '../../../replay-server';
import {initGithub} from '../../../utils/github';

test.beforeEach(async (t) => {
  const {server, url} = await startTestReplayServer(t);
  t.context.server = server;

  initGithub(url, url);
});

test.afterEach.cb((t) => {
  t.context.server.close(t.end);
});

test.serial('WebComponents stars', async (t) => {
  const result = await getStars({org: 'WebComponents'});
  t.is(result.stars.length, 6144);
});

test.serial('WebComponents/webcomponents.org stars', async (t) => {
  const result =
      await getStars({org: 'WebComponents', repo: 'webcomponents.org'});
  t.is(result.stars.length, 127);
  t.truthy(result.summary());
  t.truthy(result.rawData());
});
