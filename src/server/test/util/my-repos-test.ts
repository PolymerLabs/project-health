import * as ava from 'ava';

import {getMyRepos} from '../../util/my-repos';
import {startTestReplayServer} from '../replay-server';

/**
 * Assigns the test context object before each test to ensure it is correctly
 * typed.
 */
function contextualize<T>(getContext: (_: ava.TestContext) => Promise<T>):
    ava.RegisterContextual<T> {
  ava.test.beforeEach(async (t) => {
    Object.assign(t.context, await getContext(t));
  });
  return ava.test;
}

/**
 * Generates the test context object before each test.
 */
const test = contextualize(async (t) => {
  const {server, client} = await startTestReplayServer(t);
  return {
    server: server,
    client,
  };
});


test.beforeEach(async (t) => {
  const {server, client} = await startTestReplayServer(t);
  t.context.server = server;
  t.context.client = client;
});

test.afterEach.cb((t) => {
  t.context.server.close(t.end);
});

test('top contributed repos for samuelli', async (t) => {
  const result = await getMyRepos(t.context.client, 'samuelli', '');
  t.deepEqual(result, [
    'webcomponents/webcomponents.org',
    'GoogleChrome/rendertron',
    'webcomponents/community',
    'PolymerLabs/project-health',
    'samuelli/paper-card',
    'samuelli/progress-bar',
    'PolymerElements/app-layout',
    'GoogleWebComponents/google-map',
    'PolymerElements/iron-flex-layout',
  ]);
});
