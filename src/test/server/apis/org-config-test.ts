import anyTest, {TestInterface} from 'ava';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {handleGetConfigRequest, handleSaveConfigRequest} from '../../../server/apis/org-config';
import {settingsModel} from '../../../server/models/settingsModel';
import {OrgSettings} from '../../../types/api';
import {initFirestore} from '../../../utils/firestore';
import {initSecrets} from '../../../utils/secrets';
import {newFakeRequest} from '../../utils/newFakeRequest';
import {newFakeSecrets} from '../../utils/newFakeSecrets';
import {newFakeUserRecord} from '../../utils/newFakeUserRecord';

type TestContext = {
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
  initSecrets(newFakeSecrets());
});

/**
 * Generates the test context object before each test.
 */
test.beforeEach(async (t) => {
  t.context = {
    sandbox: sinon.sandbox.create(),
  };
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
});

test.serial(
    '[org-config-api]: should handle no orgName when getting settings',
    async (t) => {
      const userRecord = newFakeUserRecord();
      const request = newFakeRequest();
      const response = await handleGetConfigRequest(request, userRecord);
      if (!('error' in response)) {
        throw new Error('Expected error response');
      }
      t.deepEqual(response.error.code, 'no-org-name');
    });

test.serial(
    '[org-config-api]: should return org settings when getting settings',
    async (t) => {
      const injectedSettings: OrgSettings = {
        fileContents: '{"example": true}',
        lastUpdated: 0,
        editors: [],
      };
      t.context.sandbox.stub(settingsModel, 'getOrgSettings')
          .callsFake((orgName) => {
            t.is(orgName, 'example-org', 'Org name');
            return injectedSettings;
          });
      const userRecord = newFakeUserRecord();
      const request = newFakeRequest();
      request.params.orgName = 'example-org';
      const response = await handleGetConfigRequest(request, userRecord);
      if (!('data' in response)) {
        throw new Error('Expected data response');
      }
      t.deepEqual(response.data, injectedSettings);
    });

test.serial(
    '[org-config-api]: should handle no orgName when saving settings',
    async (t) => {
      const userRecord = newFakeUserRecord();
      const request = newFakeRequest();
      const response = await handleSaveConfigRequest(request, userRecord);
      if (!('error' in response)) {
        throw new Error('Expected error response');
      }
      t.deepEqual(response.error.code, 'no-org-name');
    });

test.serial(
    '[org-config-api]: should handle no settings when saving settings',
    async (t) => {
      const userRecord = newFakeUserRecord();
      const request = newFakeRequest();
      request.params.orgName = 'example-org';
      const response = await handleSaveConfigRequest(request, userRecord);
      if (!('error' in response)) {
        throw new Error('Expected error response');
      }
      t.deepEqual(response.error.code, 'no-settings');
    });

test.serial(
    '[org-config-api]: should handle non-string settings when saving settings',
    async (t) => {
      const userRecord = newFakeUserRecord();
      const request = newFakeRequest();
      request.params.orgName = 'example-org';
      request.body.settings = true;
      const response = await handleSaveConfigRequest(request, userRecord);
      if (!('error' in response)) {
        throw new Error('Expected error response');
      }
      t.deepEqual(response.error.code, 'settings-not-a-string');
    });

test.serial(
    '[org-config-api]: should handle settingsModel throws string settings when saving settings',
    async (t) => {
      t.context.sandbox.stub(settingsModel, 'setOrgSettings').callsFake(() => {
        throw new Error('Injected Error.');
      });

      const userRecord = newFakeUserRecord();
      const request = newFakeRequest();
      request.params.orgName = 'example-org';
      request.body.settings = 'Oops, I\'m not JSON5';
      const response = await handleSaveConfigRequest(request, userRecord);
      if (!('error' in response)) {
        throw new Error('Expected error response');
      }
      t.deepEqual(response.error.code, 'unable-to-save');
    });

test.serial(
    '[org-config-api]: should handle successful saving of settings',
    async (t) => {
      t.context.sandbox.stub(settingsModel, 'setOrgSettings')
          .callsFake(() => {});
      const userRecord = newFakeUserRecord();
      const request = newFakeRequest();
      request.params.orgName = 'example-org';
      request.body.settings = '{}';
      const response = await handleSaveConfigRequest(request, userRecord);
      if (!('data' in response)) {
        throw new Error('Expected data response');
      }
      t.deepEqual(response.data.status, 'ok');
    });
