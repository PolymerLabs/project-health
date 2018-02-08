import * as ava from 'ava';

import {startTestReplayServer} from '../../../replay-server';
import {getMyRepos} from '../../../server/utils/my-repos';
import {initGithub} from '../../../utils/github';

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
  const {server, url} = await startTestReplayServer(t);

  initGithub(url, url);

  return {
    replayServer: server,
  };
});

test.afterEach.cb((t) => {
  t.context.replayServer.close(t.end);
});

test.serial('top contributed repos for samuelli', async (t) => {
  const result = await getMyRepos('samuelli', '');
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
