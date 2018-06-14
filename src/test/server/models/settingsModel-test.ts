import anyTest, {TestInterface} from 'ava';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {githubAppModel} from '../../../server/models/githubAppModel';
import {settingsModel} from '../../../server/models/settingsModel';
import * as genTokenUtils from '../../../server/utils/generate-github-app-token';
import {initFirestore} from '../../../utils/firestore';
import {github, initGithub} from '../../../utils/github';
import {initSecrets} from '../../../utils/secrets';
import {newFakeSecrets} from '../../utils/newFakeSecrets';
import {newFakeUserRecord} from '../../utils/newFakeUserRecord';

type TestContext = {
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
  initGithub();
  initSecrets(newFakeSecrets());
});

test.beforeEach(async (t) => {
  t.context.sandbox = sinon.sandbox.create();
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
});

test.serial(
    '[settingsModel]: should return null for non-existant org', async (t) => {
      const userRecord = newFakeUserRecord();
      userRecord.username = 'example-user';
      const result =
          await settingsModel.getOrgSettings('example-user', userRecord);
      t.is(result, null, 'Org Settings');
    });

test.serial(
    '[settingsModel]: should throw when accessing another users account',
    async (t) => {
      t.context.sandbox.stub(githubAppModel, 'getInstallationByOrgOrUserName')
          .callsFake(() => {
            return {
              installationId: 0,
            };
          });

      t.context.sandbox.stub(genTokenUtils, 'generateGithubAppToken')
          .callsFake((installId: number) => {
            t.is(installId, 0);
            return 'example-app-token';
          });

      // NOTE a user is not an org, github().get() will throw an error
      // TODO: I don't think this is correct
      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'get').callsFake(() => {
        throw new Error('Injected Error');
      });

      const userRecord = newFakeUserRecord();
      userRecord.username = 'example-user';
      await t.throws(settingsModel.getOrgSettings('diff-user', userRecord));
    });

test.serial(
    '[settingsModel]: should throw if the app is not installed', async (t) => {
      t.context.sandbox.stub(githubAppModel, 'getInstallationByOrgOrUserName')
          .callsFake(() => {
            return null;
          });

      const userRecord = newFakeUserRecord();
      userRecord.username = 'example-user';
      await t.throws(settingsModel.getOrgSettings('example-org', userRecord));
    });

test.serial(
    '[settingsModel]: should throw when user is not an active member',
    async (t) => {
      t.context.sandbox.stub(githubAppModel, 'getInstallationByOrgOrUserName')
          .callsFake(() => {
            return {
              installationId: 0,
            };
          });

      t.context.sandbox.stub(genTokenUtils, 'generateGithubAppToken')
          .callsFake((installId: number) => {
            t.is(installId, 0);
            return 'example-app-token';
          });

      // NOTE a user is not an org, github().get() will throw an error
      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'get').callsFake(() => {
        return {
          state: 'pending',
          role: 'admin',
        };
      });

      const userRecord = newFakeUserRecord();
      userRecord.username = 'example-user';
      await t.throws(settingsModel.getOrgSettings('example-org', userRecord));
    });

test.serial(
    '[settingsModel]: should set and return user settings', async (t) => {
      const userRecord = newFakeUserRecord();
      userRecord.username = 'example-user';
      await settingsModel.setOrgSettings(
          'example-user', '{"hello": "world"}', userRecord);

      const result =
          await settingsModel.getOrgSettings('example-user', userRecord);
      if (!result) {
        throw new Error('Expected settings.');
      }
      t.deepEqual(result.editors, ['example-user'], 'Settings Editors');
      t.is(result.fileContents, '{"hello": "world"}', 'Org Settings');
    });

test.serial(
    '[settingsModel]: should set and return orgs settings', async (t) => {
      t.context.sandbox.stub(githubAppModel, 'getInstallationByOrgOrUserName')
          .callsFake(() => {
            return {
              installationId: 0,
            };
          });

      t.context.sandbox.stub(genTokenUtils, 'generateGithubAppToken')
          .callsFake((installId: number) => {
            t.is(installId, 0);
            return 'example-app-token';
          });

      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'get')
          .callsFake((_url: string, token: string) => {
            t.is(token, 'example-app-token');
            return {
              json: async () => {
                return {state: 'active', role: 'admin'};
              }
            };
          });

      const userRecord = newFakeUserRecord();
      userRecord.username = 'example-user';
      await settingsModel.setOrgSettings(
          'example-org', '{"hello": "world"}', userRecord);

      const result =
          await settingsModel.getOrgSettings('example-org', userRecord);
      if (!result) {
        throw new Error('Expected settings.');
      }
      t.deepEqual(result.editors, ['example-user'], 'Settings Editors');
      t.is(result.fileContents, '{"hello": "world"}', 'Org Settings');
    });

test.serial(
    '[settingsModel]: should update org settings and add editors',
    async (t) => {
      t.context.sandbox.stub(githubAppModel, 'getInstallationByOrgOrUserName')
          .callsFake(() => {
            return {
              installationId: 0,
            };
          });

      t.context.sandbox.stub(genTokenUtils, 'generateGithubAppToken')
          .callsFake((installId: number) => {
            t.is(installId, 0);
            return 'example-app-token';
          });

      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'get')
          .callsFake((_url: string, token: string) => {
            t.is(token, 'example-app-token');
            return {
              json: async () => {
                return {
                  state: 'active',
                  role: 'admin',
                };
              }
            };
          });

      const userRecord = newFakeUserRecord();
      userRecord.username = 'example-user-1';
      await settingsModel.setOrgSettings(
          'example-org-2', '{"hello": "world"}', userRecord);

      await settingsModel.setOrgSettings(
          'example-org-2', '{"hello": "world1"}', userRecord);

      userRecord.username = 'example-user-2';
      await settingsModel.setOrgSettings(
          'example-org-2', '{"hello": "world2"}', userRecord);

      const result =
          await settingsModel.getOrgSettings('example-org-2', userRecord);
      if (!result) {
        throw new Error('Expected settings.');
      }
      t.deepEqual(
          result.editors,
          ['example-user-1', 'example-user-2'],
          'Settings Editors');
      t.is(result.fileContents, '{"hello": "world2"}', 'Org Settings');
    });

test.serial(
    '[settingsModel]: should throw when attempting to set settings on an org without admin rights',
    async (t) => {
      t.context.sandbox.stub(githubAppModel, 'getInstallationByOrgOrUserName')
          .callsFake(() => {
            return {
              installationId: 0,
            };
          });

      t.context.sandbox.stub(genTokenUtils, 'generateGithubAppToken')
          .callsFake((installId: number) => {
            t.is(installId, 0);
            return 'example-app-token';
          });

      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'get')
          .callsFake((_url: string, token: string) => {
            t.is(token, 'example-app-token');
            return {
              state: 'active',
              role: 'member',
            };
          });

      const userRecord = newFakeUserRecord();
      await t.throws(
          settingsModel.setOrgSettings('example-org', '{}', userRecord));
    });

test.serial(
    '[settingsModel]: should throw when attempting to save non-JSON data',
    async (t) => {
      t.context.sandbox.stub(githubAppModel, 'getInstallationByOrgOrUserName')
          .callsFake(() => {
            return {
              installationId: 0,
            };
          });

      t.context.sandbox.stub(genTokenUtils, 'generateGithubAppToken')
          .callsFake((installId: number) => {
            t.is(installId, 0);
            return 'example-app-token';
          });

      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'get')
          .callsFake((_url: string, token: string) => {
            t.is(token, 'example-app-token');
            return {
              state: 'active',
              role: 'admin',
            };
          });

      const userRecord = newFakeUserRecord();
      await t.throws(settingsModel.setOrgSettings(
          'example-org', 'This is not JSON - eek', userRecord));
    });

test.serial(
    '[settingsModel]: should not set when user is not an active member',
    async (t) => {
      t.context.sandbox.stub(githubAppModel, 'getInstallationByOrgOrUserName')
          .callsFake(() => {
            return {
              installationId: 0,
            };
          });

      t.context.sandbox.stub(genTokenUtils, 'generateGithubAppToken')
          .callsFake((installId: number) => {
            t.is(installId, 0);
            return 'example-app-token';
          });

      // NOTE a user is not an org, github().get() will throw an error
      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'get').callsFake(() => {
        return {
          state: 'pending',
          role: 'admin',
        };
      });

      const userRecord = newFakeUserRecord();
      userRecord.username = 'example-user';
      await t.throws(
          settingsModel.setOrgSettings('example-org', '{}', userRecord));
    });
