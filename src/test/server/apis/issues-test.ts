import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {handleActivityIssues, handleAssignedIssues} from '../../../server/apis/issues';
import {userModel} from '../../../server/models/userModel';
import {IssuesResponse} from '../../../types/api';
import {initFirestore} from '../../../utils/firestore';
import {github, initGithub} from '../../../utils/github';
import {newFakeUserRecord} from '../../utils/newFakeUserRecord';
import {startTestReplayServer} from '../../utils/replay-server';

type TestContext = {
  replayServer: Server,
  replayAddress: string,
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

// tslint:disable-next-line: no-any
function newFakeResponse(): any {
  const response = {
    status: () => {
      return response;
    },
    send: () => {},
    json: () => {}
  };
  return response;
}

function newFakeRequest() {
  return {
    body: '',
    query: {},
    // tslint:disable-next-line: no-any
  } as any;
}

test.before(() => {
  initFirestore();
});

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
  t.context.sandbox.restore();
  await new Promise((resolve) => {
    t.context.replayServer.close(resolve);
  });
});

test.serial('[assignedIssues]: should return 401 when no record', async (t) => {
  t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
      .callsFake(() => {
        return null;
      });

  const response = newFakeResponse();
  const statusSpy = t.context.sandbox.spy(response, 'status');
  const sendSpy = t.context.sandbox.spy(response, 'send');
  const jsonSpy = t.context.sandbox.spy(response, 'json');

  await handleAssignedIssues(newFakeRequest(), response);

  t.deepEqual(statusSpy.args[0][0], 401, 'Status code');
  t.deepEqual(sendSpy.callCount, 1, 'send() call count');
  t.deepEqual(jsonSpy.callCount, 0, 'json() call count');
});

test.serial(
    '[assignedIssues]: should retrieve issues for a user (Using replays)',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
          .callsFake(() => {
            const user = newFakeUserRecord();
            user.username = 'project-health1';
            return user;
          });

      const response = newFakeResponse();
      const sendSpy = t.context.sandbox.spy(response, 'send');
      const jsonSpy = t.context.sandbox.spy(response, 'json');

      await handleAssignedIssues(newFakeRequest(), response);

      t.deepEqual(sendSpy.callCount, 0, 'send() call count');
      t.deepEqual(jsonSpy.callCount, 1, 'json() call count');
      const responsePayload = jsonSpy.args[0][0] as IssuesResponse;
      t.deepEqual(responsePayload.issues, [
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
          hasNewActivity: false,
          status: {type: 'Assigned'},
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
          hasNewActivity: false,
          status: {type: 'Assigned'},
        },
      ]);
    });

test.serial(
    '[assignedIssues]: should retrieve issues for a user with a login query parameter',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
          .callsFake(() => newFakeUserRecord());

      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query').callsFake((options) => {
        t.deepEqual(
            options.variables.query,
            'assignee:query-username is:issue state:open archived:false',
            'Github query');
        return {data: {search: {}}};
      });

      const response = newFakeResponse();
      const sendSpy = t.context.sandbox.spy(response, 'send');
      const jsonSpy = t.context.sandbox.spy(response, 'json');

      const request = newFakeRequest();
      request.query = {
        login: 'query-username',
      };

      await handleAssignedIssues(request, response);

      t.deepEqual(sendSpy.callCount, 0, 'send() call count');
      t.deepEqual(jsonSpy.callCount, 1, 'json() call count');
      const responsePayload = jsonSpy.args[0][0] as IssuesResponse;
      t.deepEqual(responsePayload.issues, []);
    });

test.serial(
    '[assignedIssues]: Should filter out empty issue nodes', async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
          .callsFake(() => newFakeUserRecord());

      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query').callsFake(() => {
        return {
          data: {
            search: {
              nodes: [
                null,
              ]
            }
          }
        };
      });

      const response = newFakeResponse();
      const sendSpy = t.context.sandbox.spy(response, 'send');
      const jsonSpy = t.context.sandbox.spy(response, 'json');

      await handleAssignedIssues(newFakeRequest(), response);

      t.deepEqual(sendSpy.callCount, 0, 'send() call count');
      t.deepEqual(jsonSpy.callCount, 1, 'json() call count');
      const responsePayload = jsonSpy.args[0][0] as IssuesResponse;
      t.deepEqual(responsePayload.issues, []);
    });

test.serial(
    '[assignedIssues]: Should filter out non-issue nodes', async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
          .callsFake(() => newFakeUserRecord());

      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query').callsFake(() => {
        return {
          data: {
            search: {
              nodes: [
                {__typename: 'Unknown'},
              ]
            }
          }
        };
      });

      const response = newFakeResponse();
      const sendSpy = t.context.sandbox.spy(response, 'send');
      const jsonSpy = t.context.sandbox.spy(response, 'json');

      await handleAssignedIssues(newFakeRequest(), response);

      t.deepEqual(sendSpy.callCount, 0, 'send() call count');
      t.deepEqual(jsonSpy.callCount, 1, 'json() call count');
      const responsePayload = jsonSpy.args[0][0] as IssuesResponse;
      t.deepEqual(responsePayload.issues, []);
    });

test.serial(
    '[assignedIssues]: Should filter out issue nodes without author',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
          .callsFake(() => newFakeUserRecord());

      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query').callsFake(() => {
        return {
          data: {
            search: {
              nodes: [
                {__typename: 'Issue'},
              ]
            }
          }
        };
      });

      const response = newFakeResponse();
      const sendSpy = t.context.sandbox.spy(response, 'send');
      const jsonSpy = t.context.sandbox.spy(response, 'json');

      await handleAssignedIssues(newFakeRequest(), response);

      t.deepEqual(sendSpy.callCount, 0, 'send() call count');
      t.deepEqual(jsonSpy.callCount, 1, 'json() call count');
      const responsePayload = jsonSpy.args[0][0] as IssuesResponse;
      t.deepEqual(responsePayload.issues, []);
    });

test.serial(
    '[assignedIssues]: should retrieve issues for a user with new activity',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
          .callsFake(() => {
            const record = newFakeUserRecord();
            record.featureLastViewed.enabledAt = 0;
            return record;
          });
      t.context.sandbox.stub(userModel, 'getAllLastViewedInfo')
          .callsFake(() => {
            return {
              '123': 1,
              '456': 3,
            };
          });

      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query').callsFake(() => {
        return {
          data: {
            search: {
              nodes: [
                {
                  __typename: 'Issue',
                  id: '123',
                  title: 'test-title',
                  url: 'https://example.com/test/url',
                  createdAt: 2,
                  author: {
                    login: 'test-user',
                    avatarUrl: 'https://example.com/test-image.png',
                  },
                  repository: {
                    name: 'test-repo',
                    owner: {
                      login: 'test-owner',
                    },
                  },
                  comments: {

                  },
                  participants: {
                    totalCount: 1,
                  },
                  reactions: {
                    totalCount: 0,
                  },
                  commentTotal: {
                    count: 0,
                  }
                },
                {
                  __typename: 'Issue',
                  id: '456',
                  title: 'test-title',
                  url: 'https://example.com/test/url',
                  createdAt: 2,
                  author: {
                    login: 'test-user',
                    avatarUrl: 'https://example.com/test-image.png',
                  },
                  repository: {
                    name: 'test-repo',
                    owner: {
                      login: 'test-owner',
                    },
                  },
                  comments: {

                  },
                  participants: {
                    totalCount: 1,
                  },
                  reactions: {
                    totalCount: 0,
                  },
                  commentTotal: {
                    count: 0,
                  }
                },
              ]
            }
          }
        };
      });

      const response = newFakeResponse();
      const sendSpy = t.context.sandbox.spy(response, 'send');
      const jsonSpy = t.context.sandbox.spy(response, 'json');

      await handleAssignedIssues(newFakeRequest(), response);

      t.deepEqual(sendSpy.callCount, 0, 'send() call count');
      t.deepEqual(jsonSpy.callCount, 1, 'json() call count');
      const responsePayload = jsonSpy.args[0][0] as IssuesResponse;
      t.deepEqual(responsePayload.issues, [
        {
          id: '123',
          title: 'test-title',
          repo: 'test-repo',
          owner: 'test-owner',
          author: 'test-user',
          avatarUrl: 'https://example.com/test-image.png',
          createdAt: 2,
          url: 'https://example.com/test/url',
          popularity: 1,
          hasNewActivity: true,
          status: {type: 'Assigned'},
        },
        {
          id: '456',
          title: 'test-title',
          repo: 'test-repo',
          owner: 'test-owner',
          author: 'test-user',
          avatarUrl: 'https://example.com/test-image.png',
          createdAt: 2,
          url: 'https://example.com/test/url',
          popularity: 1,
          hasNewActivity: false,
          status: {type: 'Assigned'},
        },
      ]);
    });

test.serial(
    '[assignedIssues]: should handle issues for another user and *not* use last viewed',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
          .callsFake(() => {
            const record = newFakeUserRecord();
            record.featureLastViewed.enabledAt = 0;
            return record;
          });
      t.context.sandbox.stub(userModel, 'getAllLastViewedInfo').callsFake(() => {
        t.fail(
            'getAllLastViewedInfo should not be called when looking at a different user');
      });

      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query').callsFake(() => {
        return {
          data: {
            search: {
              nodes: [
                {
                  __typename: 'Issue',
                  id: '123',
                  title: 'test-title',
                  url: 'https://example.com/test/url',
                  createdAt: 2,
                  author: {
                    login: 'test-user',
                    avatarUrl: 'https://example.com/test-image.png',
                  },
                  repository: {
                    name: 'test-repo',
                    owner: {
                      login: 'test-owner',
                    },
                  },
                  comments: {

                  },
                  participants: {
                    totalCount: 1,
                  },
                  reactions: {
                    totalCount: 0,
                  },
                  commentTotal: {
                    count: 0,
                  }
                },
                {
                  __typename: 'Issue',
                  id: '456',
                  title: 'test-title',
                  url: 'https://example.com/test/url',
                  createdAt: 2,
                  author: {
                    login: 'test-user',
                    avatarUrl: 'https://example.com/test-image.png',
                  },
                  repository: {
                    name: 'test-repo',
                    owner: {
                      login: 'test-owner',
                    },
                  },
                  comments: {

                  },
                  participants: {
                    totalCount: 1,
                  },
                  reactions: {
                    totalCount: 0,
                  },
                  commentTotal: {
                    count: 0,
                  }
                },
              ]
            }
          }
        };
      });

      const response = newFakeResponse();
      const sendSpy = t.context.sandbox.spy(response, 'send');
      const jsonSpy = t.context.sandbox.spy(response, 'json');

      const request = newFakeRequest();
      request.query = {login: 'different-user'};

      await handleAssignedIssues(request, response);

      t.deepEqual(sendSpy.callCount, 0, 'send() call count');
      t.deepEqual(jsonSpy.callCount, 1, 'json() call count');
      const responsePayload = jsonSpy.args[0][0] as IssuesResponse;
      t.deepEqual(responsePayload.issues, [
        {
          id: '123',
          title: 'test-title',
          repo: 'test-repo',
          owner: 'test-owner',
          author: 'test-user',
          avatarUrl: 'https://example.com/test-image.png',
          createdAt: 2,
          url: 'https://example.com/test/url',
          popularity: 1,
          hasNewActivity: false,
          status: {type: 'Assigned'},
        },
        {
          id: '456',
          title: 'test-title',
          repo: 'test-repo',
          owner: 'test-owner',
          author: 'test-user',
          avatarUrl: 'https://example.com/test-image.png',
          createdAt: 2,
          url: 'https://example.com/test/url',
          popularity: 1,
          hasNewActivity: false,
          status: {type: 'Assigned'},
        },
      ]);
    });

test.serial(
    '[assignedIssues]: should handle when an issue has no last activity (i.e. author of issue is the current user)',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
          .callsFake(() => {
            const record = newFakeUserRecord();
            record.username = 'test-user';
            return record;
          });
      t.context.sandbox.stub(userModel, 'getAllLastViewedInfo')
          .callsFake(() => {
            return {
              '123': 1,
            };
          });

      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query').callsFake(() => {
        return {
          data: {
            search: {
              nodes: [{
                __typename: 'Issue',
                id: '123',
                title: 'test-title',
                url: 'https://example.com/test/url',
                createdAt: 2,
                author: {
                  login: 'test-user',
                  avatarUrl: 'https://example.com/test-image.png',
                },
                repository: {
                  name: 'test-repo',
                  owner: {
                    login: 'test-owner',
                  },
                },
                comments: {

                },
                participants: {
                  totalCount: 1,
                },
                reactions: {
                  totalCount: 0,
                },
                commentTotal: {
                  count: 0,
                }
              }]
            }
          }
        };
      });

      const response = newFakeResponse();
      const sendSpy = t.context.sandbox.spy(response, 'send');
      const jsonSpy = t.context.sandbox.spy(response, 'json');

      await handleAssignedIssues(newFakeRequest(), response);

      t.deepEqual(sendSpy.callCount, 0, 'send() call count');
      t.deepEqual(jsonSpy.callCount, 1, 'json() call count');
      const responsePayload = jsonSpy.args[0][0] as IssuesResponse;
      t.deepEqual(responsePayload.issues, [{
                    id: '123',
                    title: 'test-title',
                    repo: 'test-repo',
                    owner: 'test-owner',
                    author: 'test-user',
                    avatarUrl: 'https://example.com/test-image.png',
                    createdAt: 2,
                    url: 'https://example.com/test/url',
                    popularity: 1,
                    hasNewActivity: false,
                    status: {type: 'Assigned'},
                  }]);
    });

test.serial('[issueActivity]: should return 401 when no record', async (t) => {
  t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
      .callsFake(() => {
        return null;
      });

  const response = newFakeResponse();
  const statusSpy = t.context.sandbox.spy(response, 'status');
  const sendSpy = t.context.sandbox.spy(response, 'send');
  const jsonSpy = t.context.sandbox.spy(response, 'json');

  await handleActivityIssues(newFakeRequest(), response);

  t.deepEqual(statusSpy.args[0][0], 401, 'Status code');
  t.deepEqual(sendSpy.callCount, 1, 'send() call count');
  t.deepEqual(jsonSpy.callCount, 0, 'json() call count');
});

test.serial(
    '[issueActivity]: should retrieve issues for a user (Using replays)',
    async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
          .callsFake(() => {
            const user = newFakeUserRecord();
            user.username = 'project-health1';
            return user;
          });

      const response = newFakeResponse();
      const sendSpy = t.context.sandbox.spy(response, 'send');
      const jsonSpy = t.context.sandbox.spy(response, 'json');

      await handleActivityIssues(newFakeRequest(), response);

      t.deepEqual(sendSpy.callCount, 0, 'send() call count');
      t.deepEqual(jsonSpy.callCount, 1, 'json() call count');
      const responsePayload = jsonSpy.args[0][0] as IssuesResponse;
      t.deepEqual(responsePayload.issues, []);
    });

test.serial(
    '[issueActivity]: should return Involved status types', async (t) => {
      t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
          .callsFake(() => newFakeUserRecord());

      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query').callsFake(() => {
        return {
          data: {
            search: {
              nodes: [{
                __typename: 'Issue',
                id: '123',
                title: 'test-title',
                url: 'https://example.com/test/url',
                createdAt: 2,
                author: {
                  login: 'test-user',
                  avatarUrl: 'https://example.com/test-image.png',
                },
                repository: {
                  name: 'test-repo',
                  owner: {
                    login: 'test-owner',
                  },
                },
                comments: {

                },
                participants: {
                  totalCount: 1,
                },
                reactions: {
                  totalCount: 0,
                },
                commentTotal: {
                  count: 0,
                }
              }]
            }
          }
        };
      });

      const response = newFakeResponse();
      const sendSpy = t.context.sandbox.spy(response, 'send');
      const jsonSpy = t.context.sandbox.spy(response, 'json');

      await handleActivityIssues(newFakeRequest(), response);

      t.deepEqual(sendSpy.callCount, 0, 'send() call count');
      t.deepEqual(jsonSpy.callCount, 1, 'json() call count');
      const responsePayload = jsonSpy.args[0][0] as IssuesResponse;
      t.deepEqual(responsePayload.issues, [{
                    id: '123',
                    title: 'test-title',
                    repo: 'test-repo',
                    owner: 'test-owner',
                    author: 'test-user',
                    avatarUrl: 'https://example.com/test-image.png',
                    createdAt: 2,
                    url: 'https://example.com/test/url',
                    popularity: 1,
                    hasNewActivity: false,
                    status: {type: 'Involved'},
                  }]);
    });

test.serial('[issueActivity]: should return Author status types', async (t) => {
  t.context.sandbox.stub(userModel, 'getUserRecordFromRequest')
      .callsFake(() => {
        const user = newFakeUserRecord();
        user.username = 'example-user';
        return user;
      });

  const githubInstance = github();
  t.context.sandbox.stub(githubInstance, 'query').callsFake(() => {
    return {
      data: {
        search: {
          nodes: [{
            __typename: 'Issue',
            id: '123',
            title: 'test-title',
            url: 'https://example.com/test/url',
            createdAt: 2,
            author: {
              login: 'example-user',
              avatarUrl: 'https://example.com/test-image.png',
            },
            repository: {
              name: 'test-repo',
              owner: {
                login: 'test-owner',
              },
            },
            comments: {

            },
            participants: {
              totalCount: 1,
            },
            reactions: {
              totalCount: 0,
            },
            commentTotal: {
              count: 0,
            }
          }]
        }
      }
    };
  });

  const response = newFakeResponse();
  const sendSpy = t.context.sandbox.spy(response, 'send');
  const jsonSpy = t.context.sandbox.spy(response, 'json');

  await handleActivityIssues(newFakeRequest(), response);

  t.deepEqual(sendSpy.callCount, 0, 'send() call count');
  t.deepEqual(jsonSpy.callCount, 1, 'json() call count');
  const responsePayload = jsonSpy.args[0][0] as IssuesResponse;
  t.deepEqual(responsePayload.issues, [{
                id: '123',
                title: 'test-title',
                repo: 'test-repo',
                owner: 'test-owner',
                author: 'example-user',
                avatarUrl: 'https://example.com/test-image.png',
                createdAt: 2,
                url: 'https://example.com/test/url',
                popularity: 1,
                hasNewActivity: false,
                status: {type: 'Author'},
              }]);
});
