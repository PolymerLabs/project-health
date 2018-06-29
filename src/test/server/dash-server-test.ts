import anyTest, {TestInterface} from 'ava';
import fetch from 'node-fetch';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {DashServer} from '../../server/dash-server';
import {githubAppModel} from '../../server/models/githubAppModel';
import {userModel} from '../../server/models/userModel';
import {initFirestore} from '../../utils/firestore';
import {initSecrets} from '../../utils/secrets';
import {newFakeSecrets} from '../utils/newFakeSecrets';

type TestContext = {
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
  initSecrets(newFakeSecrets());
});

test.beforeEach(async (t) => {
  t.context.sandbox = sinon.sandbox.create();
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
});

test.serial('[dash-server]: /webhook/ ping should return 200', async (t) => {
  const server = new DashServer();
  const address = await server.listen(8081);

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

test.serial(
    '[dash-server]: /github-app/post-install/ should return 400 for no search params',
    async (t) => {
      const server = new DashServer();
      const address = await server.listen(8081);

      const response = await fetch(`${address}/github-app/post-install/`, {
        method: 'GET',
      });

      await server.close();

      t.is(response.status, 400, 'Response status code');
    });

test.serial(
    '[dash-server]: /github-app/post-install/ should redirect a non-signed in user to signin page',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
          .callsFake(() => {
            return null;
          });

      t.context.sandbox.stub(githubAppModel, 'getInstallation')
          .callsFake(() => {
            return null;
          });

      const server = new DashServer();
      const address = await server.listen(8081);

      const response =
          await fetch(`${address}/github-app/post-install/?installation_id=0`, {
            method: 'GET',
            redirect: 'manual',
          });

      await server.close();

      t.is(response.status, 302, 'Response status code');
      t.is(
          response.headers.get('location'),
          `${address}/signin?final-redirect=${
              encodeURIComponent(
                  '/github-app/post-install/?installation_id=0')}`,
          'Expected redirect URL');
    });

test.serial(
    '[dash-server]: /github-app/post-install/ should return 302 for existing installation_id',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
          .callsFake(() => {
            return {
              login: 'example-user',
            };
          });

      t.context.sandbox.stub(githubAppModel, 'getInstallation')
          .callsFake(() => {
            return {
              login: 'test-login',
            };
          });
      const server = new DashServer();
      const address = await server.listen(8081);

      const response =
          await fetch(`${address}/github-app/post-install/?installation_id=0`, {
            method: 'GET',
            redirect: 'manual',
          });

      await server.close();

      t.is(response.status, 302, 'Response status code');
      t.is(
          response.headers.get('location'),
          `${address}/org/config/test-login`,
          'Expected redirect URL');
    });

test('[dash-server]: should resolve if closed without starting', async (t) => {
  const server = new DashServer();
  await server.close();
  t.pass();
});
