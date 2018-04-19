import test from 'ava';

import {generateMyRepoList} from '../../../server/utils/my-repos';
import {initGithub} from '../../../utils/github';
import {getTestTokens} from '../../get-test-tokens';
import {startTestReplayServer} from '../../utils/replay-server';

test('[my-repos] top contributed repos for samuelli', async (t) => {
  const {server, url} = await startTestReplayServer(t);
  initGithub(url, url);
  const result = await generateMyRepoList(
      'samuelli', getTestTokens()['project-health1'] || 'fake-token');
  t.deepEqual(result, [
    {
      'owner': 'PolymerLabs',
      'name': 'project-health',
      'avatarUrl': 'https://avatars2.githubusercontent.com/u/5912903?v=4'
    },
    {
      'owner': 'webcomponents',
      'name': 'webcomponents.org',
      'avatarUrl': 'https://avatars2.githubusercontent.com/u/1905708?v=4'
    },
    {
      'owner': 'GoogleChrome',
      'name': 'rendertron',
      'avatarUrl': 'https://avatars3.githubusercontent.com/u/1778935?v=4'
    }
  ]);
  server.close();
});
