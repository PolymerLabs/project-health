import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {startTestReplayServer} from '../../../replay-server';
import {handleGetIssues} from '../../../server/apis/issues';
import {userModel} from '../../../server/models/userModel';
import {IssuesResponse} from '../../../types/api';
import {initGithub} from '../../../utils/github';
import {getTestTokens} from '../../get-test-tokens';

type TestContext = {
  replayServer: Server,
  replayAddress: string,
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

/**
 * Generates the test context object before each test.
 */
test.beforeEach(async (t) => {
  const {server, url} = await startTestReplayServer(t);
  initGithub(url, url);

  t.context = {
    replayServer: server,
    replayAddress: url,
    sandbox: sinon.sandbox.create(),
  };
});

test.afterEach.always(async (t) => {
  await new Promise((resolve) => {
    t.context.replayServer.close(resolve);
  });
  t.context.sandbox.restore();
});

test('[issues]: should retrieve issues for a user', async (t) => {
  t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
      .callsFake(() => {
        return {
          username: 'project-health1',
          githubToken: getTestTokens()['project-health1'],
        };
      });
  const response = {
    status: () => response,
    send: (text: string) => {
      t.fail(`.send() should not have been called but received: ${text}`);
    },
    json: (response: IssuesResponse) => {
      t.deepEqual(response.issues, [
        {
          id: 'MDU6SXNzdWUzMDgyMTA0Njc=',
          title: 'I found a bug.',
          repo: 'repo',
          owner: 'project-health1',
          author: 'project-health2',
          avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
          createdAt: 1521849856000,
          url: 'https://github.com/project-health1/repo/issues/16',
          popularity: 1,
        },
        {
          id: 'MDU6SXNzdWUzMDgyMTAyNzM=',
          title: 'Self Assigned Issue',
          repo: 'repo',
          owner: 'project-health1',
          author: 'project-health1',
          avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
          createdAt: 1521849762000,
          url: 'https://github.com/project-health1/repo/issues/15',
          popularity: 1,
        },
      ]);
    }
  };
  await handleGetIssues(
      {
        body: '',
        query: {},
        // tslint:disable-next-line: no-any
      } as any,
      // tslint:disable-next-line: no-any
      response as any);
});
