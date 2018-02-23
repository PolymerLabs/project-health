import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';
import * as puppeteer from 'puppeteer';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {testScreenshot} from '../../pixel-tester';
import {startTestReplayServer} from '../../replay-server';
import {DashServer} from '../../server/dash-server';
import {LoginDetails, userModel} from '../../server/models/userModel';
import {initGithub} from '../../utils/github';

type TestContext = {
  dashServer: DashServer,
  dashAddress: string,
  replayServer: Server,
  replayAddress: string,
  browser: puppeteer.Browser,
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

test.before(async (t) => {
  const {server, url} =
      await startTestReplayServer(t, 'project-health1-dashboard');
  const dashServer = new DashServer();
  t.context = {
    browser: await puppeteer.launch(),
    dashServer,
    dashAddress: await dashServer.listen(),
    replayServer: server,
    replayAddress: url,
    sandbox: sinon.sandbox.create(),
  };

  initGithub(t.context.replayAddress, t.context.replayAddress);
});

test('project-health1 dashboard UI', async (t) => {
  const page = await t.context.browser.newPage();

  const getFakeLogin = (): LoginDetails => {
    return {
      username: 'project-health1',
      avatarUrl: null,
      fullname: null,
      githubToken: '',
      scopes: null,
    };
  };
  const loginStub = t.context.sandbox.stub(userModel, 'getLoginFromRequest')
                        .callsFake(getFakeLogin);

  await page.goto(t.context.dashAddress, {waitUntil: 'networkidle0'});
  t.true(loginStub.called);
  await testScreenshot(page, t);
});

test.afterEach.always((t) => {
  t.context.sandbox.restore();
});

test.after(async (t) => {
  t.context.replayServer.close();
  t.context.dashServer.close();
  await t.context.browser.close();
});
