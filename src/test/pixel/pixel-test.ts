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
  replayServer: Server,
  replayAddress: string,
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

let browser: puppeteer.Browser;
let dashServer: DashServer;
let dashAddress: string;
test.before(async () => {
  initFirestore();
  browser = await puppeteer.launch({args: ['--no-sandbox']});

  dashServer = new DashServer();
  dashAddress = await dashServer.listen();
});

test.beforeEach(async (t) => {
  const {server, url} = await startTestReplayServer(t);

  t.context = {
    replayServer: server,
    replayAddress: url,
    sandbox: sinon.sandbox.create(),
  };

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


  initGithub(t.context.replayAddress, t.context.replayAddress);
});

test.afterEach.always(async (t) => {
  t.context.sandbox.restore();
  await new Promise((resolve) => {
    t.context.replayServer.close(resolve);
  });
});

test.after.always(async () => {
  await browser.close();
  await dashServer.close();
});

test.serial('[pixel-test] project-health1 dashboard UI', async (t) => {
  const page = await browser.newPage();
  await page.goto(dashAddress, {waitUntil: 'networkidle0'});

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


test.serial('[pixel-test] project-health1 outgoing UI', async (t) => {
  const page = await browser.newPage();
  await page.goto(`${dashAddress}/outgoing`, {waitUntil: 'networkidle0'});

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
