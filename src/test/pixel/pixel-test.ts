import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';
import * as puppeteer from 'puppeteer';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {DashServer} from '../../server/dash-server';
import {userModel} from '../../server/models/userModel';
import {initFirestore} from '../../utils/firestore';
import {initGithub} from '../../utils/github';
import {newFakeUserRecord} from '../utils/newFakeUserRecord';
import {testScreenshot} from '../utils/pixel-tester';
import {startTestReplayServer} from '../utils/replay-server';

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

  browser = await puppeteer.launch(
      {args: ['--no-sandbox', '--disable-setuid-sandbox']});

  dashServer = new DashServer();
  dashAddress = await dashServer.listen(8080);
});

test.beforeEach(async (t) => {
  const {server, url} = await startTestReplayServer(t);

  t.context = {
    replayServer: server,
    replayAddress: url,
    sandbox: sinon.sandbox.create(),
  };

  // Stub login to point to fake user.
  t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
      .callsFake(() => {
        const userRecord = newFakeUserRecord();
        userRecord.username = 'project-health1';
        return userRecord;
      });

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
