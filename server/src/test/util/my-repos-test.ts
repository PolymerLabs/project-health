import test from 'ava';

import {getMyRepos} from '../../util/my-repos';
import {startTestReplayServer} from '../replay-server';

test.beforeEach(async (t) => {
  const {server, client} = await startTestReplayServer(t);
  t.context.server = server;
  t.context.client = client;
});

test.afterEach.cb((t) => {
  t.context.server.close(t.end);
});

test('top contributed repos for samuelli', async (t) => {
  const result = await getMyRepos(t.context.client, 'samuelli');
  t.is(result, [
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
