import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';

import {getReviewLatency} from '../../../cli/metrics/review-latency';
import {startTestReplayServer} from '../../../replay-server';
import {initGithub} from '../../../utils/github';

const test = anyTest as TestInterface<{server: Server}>;

test.beforeEach(async (t) => {
  const {server, url} = await startTestReplayServer(t);
  t.context.server = server;

  initGithub(url, url);
});

test.afterEach.always(async (t) => {
  await new Promise((resolve) => t.context.server.close(resolve));
});

test.serial('WebComponents review latency', async (t) => {
  const since = new Date(0);
  const result = await getReviewLatency({org: 'WebComponents', since});
  t.is(result.totalLatency, 262575635000);
  t.is(result.reviews.length, 684);
});

test.serial('WebComponents/webcomponents.org review latency', async (t) => {
  const since = new Date(0);
  const result = await getReviewLatency(
      {org: 'WebComponents', repo: 'webcomponents.org', since});
  t.is(result.totalLatency, 19466495000);
  t.is(result.reviews.length, 425);
  t.truthy(result.summary());
  t.truthy(result.rawData());
});
