import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';

import {getIssueCounts} from '../../../cli/metrics/issue-counts';
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

test.serial('WebComponents issue count', async (t) => {
  const result =
      await getIssueCounts({org: 'WebComponents', since: new Date(0)});
  t.is(result.issues.length, 1599);
  t.truthy(result.summary());
  t.truthy(result.rawData());
  // TODO Test time series by writing out golden.
});
