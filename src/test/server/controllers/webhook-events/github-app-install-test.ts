import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {AppInstaller} from '../../../../server/controllers/webhook-handlers/app-install';
import * as genTokenUtils from '../../../../server/utils/generate-github-app-token';
import * as webhooks from '../../../../types/webhooks';
import {initFirestore} from '../../../../utils/firestore';
import {github, initGithub} from '../../../../utils/github';
import {initSecrets} from '../../../../utils/secrets';
import {newFakeSecrets} from '../../../utils/newFakeSecrets';
import {startTestReplayServer} from '../../../utils/replay-server';

const appInstaller = new AppInstaller();

function newFakeHookDetails() {
  const HOOK_DATA: webhooks.InstallationPayload = {
    type: 'installation',
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
    },
    repositories: [{
      id: 456,
      name: 'test-repo',
      full_name: 'test-owner/test-repo',
      private: false,
    }],
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
    '[handleGithubAppInstall]: should handle a valid install', async (t) => {
      t.context.sandbox.stub(genTokenUtils, 'generateGithubAppToken')
          .callsFake((installId: number) => {
            t.is(installId, 123);
            return 'example-app-token';
          });

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

      const response =
          await appInstaller.handleWebhookEvent(newFakeHookDetails());
      t.not(response, null, 'Payload is handled');
    });

test.serial(
    '[handleGithubAppInstall]: should throw if the repo ID cannot be found',
    async (t) => {
      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query').callsFake(() => {
        return null;
      });

      await t.throws(appInstaller.handleWebhookEvent(newFakeHookDetails()));
    });

test.serial(
    '[handleGithubAppInstall]: should not be handled if the install has no repos',
    async (t) => {
      const details = newFakeHookDetails();
      delete details.repositories;
      const response = await appInstaller.handleWebhookEvent(details);
      t.is(response, null, 'Payload is not handled');
    });

test.serial(
    '[handleGithubAppInstall]: should handle deleting a non-existant installId',
    async (t) => {
      const details = newFakeHookDetails();
      details.action = 'deleted';
      delete details.repositories;

      const response = await appInstaller.handleWebhookEvent(details);
      t.not(response, null, 'Payload is handled');
    });

test.serial(
    '[handleGithubAppInstall]: should handle deleting an existant installId',
    async (t) => {
      t.context.sandbox.stub(genTokenUtils, 'generateGithubAppToken')
          .callsFake((installId: number) => {
            t.is(installId, 123);
            return 'example-app-token';
          });

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

      const details = newFakeHookDetails();
      let response = await appInstaller.handleWebhookEvent(details);
      t.not(response, null, 'Payload is handled');

      details.action = 'deleted';
      delete details.repositories;

      response = await appInstaller.handleWebhookEvent(details);
      t.not(response, null, 'Payload is handled');
    });

test.serial(
    '[handleGithubAppInstall]: should not handle an unsupported action',
    async (t) => {
      const details = newFakeHookDetails();
      // tslint:disable-next-line:no-any
      details.action = 'unsupported' as any;

      const response = await appInstaller.handleWebhookEvent(details);
      t.is(response, null, 'Payload is not handled');
    });
