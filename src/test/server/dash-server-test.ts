import test from 'ava';
import fetch from 'node-fetch';

import {DashServer} from '../../server/dash-server';
import {initFirestore} from '../../utils/firestore';

test.before(() => {
  initFirestore();
});

test('/webhook/ ping should return 200', async (t) => {
  const server = new DashServer();
  const address = await server.listen();

  const response = await fetch(`${address}/api/webhook/`, {
    method: 'POST',
    headers: {
      'X-GitHub-Event': 'ping',
      'X-GitHub-Delivery': 'example-delivery',
    }
  });

  await server.close();

  const textResponse = await response.text();
  t.deepEqual(textResponse, '');
  t.true(response.ok);
});

test('should resolve if closed without starting', async (t) => {
  const server = new DashServer();
  await server.close();
  t.pass();
});
