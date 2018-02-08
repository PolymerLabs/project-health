import test from 'ava';

import {getReviewCoverage} from '../../../cli/metrics/review-coverage';
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

test.serial('gen-typescript-declarations review coverage', async (t) => {
  const result = await getReviewCoverage(
      {org: 'polymer', repo: 'gen-typescript-declarations'});
  t.is(result.numReviewed(), 79);
  t.is(result.commits.length, 82);
});

test.serial('webcomponents.org review coverage', async (t) => {
  const result = await getReviewCoverage({
    org: 'webcomponents',
    repo: 'webcomponents.org',
  });
  t.is(result.numReviewed(), 552);
  t.is(result.commits.length, 904);
  t.truthy(result.summary());
  t.truthy(result.rawData());
});
