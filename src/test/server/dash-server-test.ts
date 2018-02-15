import test from 'ava';
import fetch from 'node-fetch';

import {DashServer} from '../../server/dash-server';

test('/webhook/ ping should return 200', async (t) => {
  const server = new DashServer();
  const address = await server.listen();

  const response = await fetch(`${address}/api/webhook/`, {
    method: 'POST',
    headers: {
      'X-GitHub-Event': 'ping',
    }
  });

  await server.close();

  t.true(response.ok);
});