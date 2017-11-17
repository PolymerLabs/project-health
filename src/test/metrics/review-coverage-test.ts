import test from 'ava';

import {getReviewCoverage} from '../../metrics/review-coverage';
import {startTestReplayServer} from '../replay-server';

test.beforeEach(async (t) => {
  const {server, client} = await startTestReplayServer(t);
  t.context.server = server;
  t.context.client = client;
});

test.afterEach.cb((t) => {
  t.context.server.close(t.end);
});

test('gen-typescript-declarations review coverage', async (t) => {
  const result = await getReviewCoverage(
      t.context.client, {org: 'polymer', repo: 'gen-typescript-declarations'});
  t.is(result.numReviewed(), 79);
  t.is(result.commits.length, 82);
});

test('webcomponents.org review coverage', async (t) => {
  const since = new Date(2016, 10, 1);
  const result = await getReviewCoverage(t.context.client, {
    org: 'webcomponents',
    repo: 'webcomponents.org',
    since: since.toISOString()
  });
  t.is(result.numReviewed(), 383);
  t.is(result.commits.length, 383);
});
