import anyTest, {TestInterface} from 'ava';

import {getStars} from '../../../cli/metrics/stars';
import {startTestReplayServer} from '../../../replay-server';
import {initGithub} from '../../../utils/github';
import { Server } from 'http';

// tslint:disable-next-line:no-any
const test: TestInterface<{server: Server}> = anyTest as any;

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
