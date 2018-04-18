import test from 'ava';

import {getMyRepos} from '../../../server/utils/my-repos';
import {initGithub} from '../../../utils/github';
import {startTestReplayServer} from '../../utils/replay-server';

test('top contributed repos for samuelli', async (t) => {
  const {server, url} = await startTestReplayServer(t);
  initGithub(url, url);
  const result = await getMyRepos('samuelli', '');
  t.deepEqual(result, []);
  server.close();
});
