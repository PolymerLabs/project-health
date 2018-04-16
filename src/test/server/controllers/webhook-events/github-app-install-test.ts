import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {handleGithubAppInstall, InstallHook} from '../../../../server/controllers/webhook-events/github-app-install';
import {initFirestore} from '../../../../utils/firestore';
import {github, initGithub} from '../../../../utils/github';
import {initSecrets} from '../../../../utils/secrets';
import {newFakeSecrets} from '../../../utils/newFakeSecrets';
import {startTestReplayServer} from '../../../utils/replay-server';

function newFakeHookDetails() {
  const HOOK_DATA: InstallHook = {
    action: 'created',
    installation: {
      id: 123,
      repository_selection: 'selected',
      permissions: {
        issues: 'write',
        metadata: 'read',
      },
      events: ['issues', 'issue_comment', 'label', 'milestone'],
      account: {
        login: '',
        avatar_url: '',
        type: 'Organization',
      },
      repositories: [{
        id: 456,
        name: 'test-repo',
        full_name: 'test-owner/test-repo',
      }],
    }
  };

  return Object.assign({}, HOOK_DATA);
}

type TestContext = {
  server: Server,
  sandbox: SinonSandbox
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
  initSecrets(newFakeSecrets());
});

test.beforeEach(async (t) => {
  const {server, url} = await startTestReplayServer(t);
  t.context.server = server;
  t.context.sandbox = sinon.sandbox.create();
  initGithub(url, url);
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
  await new Promise((resolve) => t.context.server.close(resolve));
});

test.serial(
    '[handleGithubAppInstall]: should not handle a non-submitted hook',
    async (t) => {
      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query').callsFake(() => {
        return {
          data: {
            repository: {
              id: 'test-repo-id',
            }
          }
        };
      });

      const response = await handleGithubAppInstall(newFakeHookDetails());
      t.is(response.handled, true, 'Webhook handled boolean.');
    });

test.serial(
    '[handleGithubAppInstall]: should throw if the repo ID cannot be found',
    async (t) => {
      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query').callsFake(() => {
        return null;
      });

      await t.throws(handleGithubAppInstall(newFakeHookDetails()));
    });
