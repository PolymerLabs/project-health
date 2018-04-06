import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';

import {getReviewCoverage} from '../../../cli/metrics/review-coverage';
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

test.serial('gen-typescript-declarations review coverage', async (t) => {
  const since = new Date(0);
  const result = await getReviewCoverage(
      {org: 'polymer', repo: 'gen-typescript-declarations', since});
  t.is(result.numReviewed(), 172);
  t.is(result.commits.length, 197);
});

test.serial('webcomponents.org review coverage', async (t) => {
  const since = new Date(0);

  const result = await getReviewCoverage(
      {org: 'webcomponents', repo: 'webcomponents.org', since});
  t.is(result.numReviewed(), 587);
  t.is(result.commits.length, 939);
  t.truthy(result.summary());
  t.truthy(result.rawData());
});
