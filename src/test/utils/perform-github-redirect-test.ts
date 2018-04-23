import anyTest, {TestInterface} from 'ava';
import {Request} from 'express';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {REQUIRED_SCOPES, userModel} from '../../server/models/userModel';
import {performGitHubRedirect} from '../../server/utils/perform-github-redirect';
import {initSecrets} from '../../utils/secrets';

import {newFakeSecrets} from './newFakeSecrets';

type TestContext = {
  sandbox: SinonSandbox
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initSecrets(newFakeSecrets());
});

test.beforeEach((t) => {
  t.context.sandbox = sinon.sandbox.create();
});

test.afterEach.always((t) => {
  t.context.sandbox.restore();
});

test(
    '[perform-github-redirect]: should redirect github authorize url for new user',
    async (t) => {
      const req = {headers: {}, cookies: {}, query: {}};
      const res = {
        redirect: sinon.spy(),
      };

      // tslint:disable-next-line no-any
      await performGitHubRedirect(req as Request, res as any);

      t.deepEqual(res.redirect.callCount, 1);
      t.deepEqual(
          res.redirect.args[0][0],
          `https://github.com/login/oauth/authorize?client_id=ClientID&scope=${
              REQUIRED_SCOPES.join(' ')}`);
    });

test(
    '[perform-github-redirect]: should redirect github authorize url for new user with extra scopes',
    async (t) => {
      const req = {
        headers: {},
        cookies: {},
        query: {scopes: 'example-1 example-2'}
      };
      const res = {
        redirect: sinon.spy(),
      };

      // tslint:disable-next-line no-any
      await performGitHubRedirect(req as Request, res as any);

      t.deepEqual(res.redirect.callCount, 1);
      t.deepEqual(
          res.redirect.args[0][0],
          `https://github.com/login/oauth/authorize?client_id=ClientID&scope=${
              REQUIRED_SCOPES.join(' ')} example-1 example-2`);
    });

test(
    '[perform-github-redirect]: should redirect github authorize url for new user with final-redirect',
    async (t) => {
      const req = {
        headers: {},
        cookies: {},
        query: {'final-redirect': '/test-redirect'}
      };
      const res = {
        redirect: sinon.spy(),
      };

      // tslint:disable-next-line no-any
      await performGitHubRedirect(req as Request, res as any);

      t.deepEqual(res.redirect.callCount, 1);
      t.deepEqual(
          res.redirect.args[0][0],
          `https://github.com/login/oauth/authorize?client_id=ClientID&scope=${
              REQUIRED_SCOPES.join(
                  ' ')}&redirect_uri=https%3A%2F%2Fgithub-health.appspot.com%2Foauth.html%3Ffinal-redirect%3D%2Ftest-redirect`);
    });

test(
    '[perform-github-redirect]: should redirect github authorize url for new user with localhost redirect origin',
    async (t) => {
      const req = {headers: {'host': 'localhost:8080'}, cookies: {}, query: {}};
      const res = {
        redirect: sinon.spy(),
      };

      // tslint:disable-next-line no-any
      await performGitHubRedirect(req as Request, res as any);

      t.deepEqual(res.redirect.callCount, 1);
      t.deepEqual(
          res.redirect.args[0][0],
          `https://github.com/login/oauth/authorize?client_id=ClientID&scope=${
              REQUIRED_SCOPES.join(
                  ' ')}&redirect_uri=https%3A%2F%2Fgithub-health.appspot.com%2Foauth.html%3Fredirect-origin%3Dhttp%3A%2F%2Flocalhost%3A8080%2Foauth.html`);
    });


test(
    '[perform-github-redirect]: should redirect github authorize url for new user with external redirect origin',
    async (t) => {
      const req = {
        headers: {'host': 'github-health-staging.appspot.com'},
        cookies: {},
        query: {}
      };
      const res = {
        redirect: sinon.spy(),
      };

      // tslint:disable-next-line no-any
      await performGitHubRedirect(req as Request, res as any);

      t.deepEqual(res.redirect.callCount, 1);
      t.deepEqual(
          res.redirect.args[0][0],
          `https://github.com/login/oauth/authorize?client_id=ClientID&scope=${
              REQUIRED_SCOPES.join(
                  ' ')}&redirect_uri=https%3A%2F%2Fgithub-health.appspot.com%2Foauth.html%3Fredirect-origin%3Dhttps%3A%2F%2Fgithub-health-staging.appspot.com%2Foauth.html`);
    });


test(
    '[perform-github-redirect]: should redirect github authorize url for existing user with merged scopes',
    async (t) => {
      const req = {
        headers: {},
        cookies: {},
        query: {scopes: 'example-1 example-2'}
      };
      const res = {
        redirect: sinon.spy(),
      };

      t.context.sandbox.stub(userModel, 'getUserRecordFromToken')
          .callsFake(() => {
            return {
              username: 'project-health1',
              avatarUrl: null,
              fullname: null,
              githubToken: '123',
              scopes: ['repo', 'example-1'],
              lastKnownUpdate: null,
            };
          });

      // tslint:disable-next-line no-any
      await performGitHubRedirect(req as Request, res as any);

      t.deepEqual(res.redirect.callCount, 1);
      t.deepEqual(
          res.redirect.args[0][0],
          `https://github.com/login/oauth/authorize?client_id=ClientID&scope=${
              REQUIRED_SCOPES.join(' ')} example-1 example-2`);
    });
