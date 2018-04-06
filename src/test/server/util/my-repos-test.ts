import test from 'ava';

import {getMyRepos} from '../../../server/utils/my-repos';
import {initGithub} from '../../../utils/github';
import {startTestReplayServer} from '../../utils/replay-server';

test('top contributed repos for samuelli', async (t) => {
  const {server, url} = await startTestReplayServer(t);
  initGithub(url, url);
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
  server.close();
});
