import test from 'ava';

import {getIssueCounts} from '../../../cli/metrics/issue-counts';
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

test.serial('WebComponents issue count', async (t) => {
  const result = await getIssueCounts({org: 'WebComponents'});
  t.is(result.issues.length, 1599);
  t.truthy(result.summary());
  t.truthy(result.rawData());
  // TODO Test time series by writing out golden.
});
