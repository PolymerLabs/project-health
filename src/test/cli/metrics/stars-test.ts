import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';

import {getStars} from '../../../cli/metrics/stars';
import {initGithub} from '../../../utils/github';
import {startTestReplayServer} from '../../utils/replay-server';

const test = anyTest as TestInterface<{server: Server}>;

test.beforeEach(async (t) => {
  const {server, url} = await startTestReplayServer(t);
  t.context.server = server;

  initGithub(url, url);
});

test.afterEach.always(async (t) => {
  await new Promise((resolve) => t.context.server.close(resolve));
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
