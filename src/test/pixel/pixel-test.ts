import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';
import * as puppeteer from 'puppeteer';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {testScreenshot} from '../../pixel-tester';
import {startTestReplayServer} from '../../replay-server';
import {DashServer} from '../../server/dash-server';
import {LoginDetails, userModel} from '../../server/models/userModel';
import {initFirestore} from '../../utils/firestore';
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
    browser: await puppeteer.launch({args: ['--no-sandbox']}),
    dashServer,
    dashAddress: await dashServer.listen(),
    replayServer: server,
    replayAddress: url,
    sandbox: sinon.sandbox.create(),
  };

  initFirestore();
  initGithub(t.context.replayAddress, t.context.replayAddress);

  const getFakeLogin = (): LoginDetails => {
    return {
      username: 'project-health1',
      avatarUrl: null,
      fullname: null,
      githubToken: '',
      scopes: null,
      lastKnownUpdate: null,
    };
  };

  // Stub login to point to fake user.
  t.context.sandbox.stub(userModel, 'getLoginFromRequest')
      .callsFake(getFakeLogin);
});

test.afterEach.always((t) => {
  t.context.sandbox.restore();
});

test.after.always(async (t) => {
  t.context.replayServer.close();
  t.context.dashServer.close();
  await t.context.browser.close();
});

test('project-health1 dashboard UI', async (t) => {
  const page = await t.context.browser.newPage();
  await page.goto(t.context.dashAddress, {waitUntil: 'networkidle0'});

  // Hide time stamps from screenshots.
  await page.$$eval('time', /* istanbul ignore next */ (elements) => {
    if (!elements) {
      return;
    }
    for (const el of elements) {
      el.style.visibility = 'hidden';
    }
    return elements;
  });

  await testScreenshot(page, t);
  await page.close();
});


test('project-health1 outgoing UI', async (t) => {
  const page = await t.context.browser.newPage();
  await page.goto(
      `${t.context.dashAddress}/outgoing`, {waitUntil: 'networkidle0'});

  // Hide time stamps from screenshots.
  await page.$$eval('time', /* istanbul ignore next */ (elements) => {
    if (!elements) {
      return;
    }
    for (const el of elements) {
      el.style.visibility = 'hidden';
    }
    return elements;
  });

  await testScreenshot(page, t);
  await page.close();
});
