import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';

import {getReviewLatency} from '../../../cli/metrics/review-latency';
import {startTestReplayServer} from '../../../replay-server';
import {initGithub} from '../../../utils/github';

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

test.serial('WebComponents review latency', async (t) => {
  const result = await getReviewLatency({org: 'WebComponents'});
  t.is(result.totalLatency, 262575635000);
  t.is(result.reviews.length, 684);
});

test.serial('WebComponents/webcomponents.org review latency', async (t) => {
  const result =
      await getReviewLatency({org: 'WebComponents', repo: 'webcomponents.org'});
  t.is(result.totalLatency, 19466495000);
  t.is(result.reviews.length, 425);
  t.truthy(result.summary());
  t.truthy(result.rawData());
});
