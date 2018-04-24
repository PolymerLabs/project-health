import anyTest, {TestInterface} from 'ava';
import {Server} from 'http';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {handleActivityIssues, handleAssignedIssues, handleByLabel, handleLabels, handleUntriagedIssues} from '../../../server/apis/issues';
import {userModel} from '../../../server/models/userModel';
import {Popularity} from '../../../types/api';
import {initFirestore} from '../../../utils/firestore';
import {github, initGithub} from '../../../utils/github';
import {newFakeRequest} from '../../utils/newFakeRequest';
import {newFakeUserRecord} from '../../utils/newFakeUserRecord';
import {startTestReplayServer} from '../../utils/replay-server';

type TestContext = {
  replayServer: Server,
  replayAddress: string,
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

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

test.serial(
    '[assignedIssues]: should retrieve issues for a user (Using replays)',
    async (t) => {
      const userRecord = newFakeUserRecord();
      userRecord.username = 'project-health1';

      const response = await handleAssignedIssues(newFakeRequest(), userRecord);
      t.is(response.statusCode, 200, 'Response status code');
      if ('error' in response) {
        throw new Error('Expected a data response');
      }
      t.deepEqual(response.data.issues, [
        {
          id: 'MDU6SXNzdWUzMDgyMTA0Njc=',
          title: 'I found a bug.',
          repo: 'repo',
          owner: 'project-health1',
          author: 'project-health2',
          avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
          createdAt: 1521849856000,
          url: 'https://github.com/project-health1/repo/issues/16',
          popularity: 1 as Popularity,
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
          popularity: 1 as Popularity,
          hasNewActivity: false,
          status: {type: 'Assigned'},
        },
      ]);
    });

test.serial(
    '[assignedIssues]: should retrieve issues for a user with a login query parameter',
    async (t) => {
      const githubInstance = github();
      t.context.sandbox.stub(githubInstance, 'query').callsFake((options) => {
        t.deepEqual(
            options.variables.query,
            'assignee:query-username is:issue state:open archived:false',
            'Github query');
        return {data: {search: {}}};
      });

      const userRecord = newFakeUserRecord();
      const request = newFakeRequest();
      request.query = {
        login: 'query-username',
      };

      const response = await handleAssignedIssues(request, userRecord);
      t.is(response.statusCode, 200, 'Response status code');
      if ('error' in response) {
        throw new Error('Expected a data response');
      }
      t.deepEqual(response.data.issues, []);
    });

test.serial(
    '[assignedIssues]: Should filter out empty issue nodes', async (t) => {
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

      const userRecord = newFakeUserRecord();
      const response = await handleAssignedIssues(newFakeRequest(), userRecord);
      t.is(response.statusCode, 200, 'Response status code');
      if ('error' in response) {
        throw new Error('Expected a data response');
      }
      t.deepEqual(response.data.issues, []);
    });

test.serial(
    '[assignedIssues]: Should filter out non-issue nodes', async (t) => {
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

      const userRecord = newFakeUserRecord();
      const response = await handleAssignedIssues(newFakeRequest(), userRecord);
      t.is(response.statusCode, 200, 'Response status code');
      if ('error' in response) {
        throw new Error('Expected a data response');
      }
      t.deepEqual(response.data.issues, []);
    });

test.serial(
    '[assignedIssues]: Should filter out issue nodes without author',
    async (t) => {
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

      const userRecord = newFakeUserRecord();
      const response = await handleAssignedIssues(newFakeRequest(), userRecord);
      t.is(response.statusCode, 200, 'Response status code');
      if ('error' in response) {
        throw new Error('Expected a data response');
      }
      t.deepEqual(response.data.issues, []);
    });

test.serial(
    '[assignedIssues]: should retrieve issues for a user with new activity',
    async (t) => {
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

      const userRecord = newFakeUserRecord();
      userRecord.featureLastViewed.enabledAt = 0;

      const response = await handleAssignedIssues(newFakeRequest(), userRecord);
      t.is(response.statusCode, 200, 'Response status code');
      if ('error' in response) {
        throw new Error('Expected a data response');
      }
      t.deepEqual(response.data.issues, [
        {
          id: '123',
          title: 'test-title',
          repo: 'test-repo',
          owner: 'test-owner',
          author: 'test-user',
          avatarUrl: 'https://example.com/test-image.png',
          createdAt: 2,
          url: 'https://example.com/test/url',
          popularity: 1 as Popularity,
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
          popularity: 1 as Popularity,
          hasNewActivity: false,
          status: {type: 'Assigned'},
        },
      ]);
    });

test.serial(
    '[assignedIssues]: should handle issues for another user and *not* use last viewed',
    async (t) => {
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

      const userRecord = newFakeUserRecord();
      userRecord.featureLastViewed.enabledAt = 0;

      const request = newFakeRequest();
      request.query = {login: 'different-user'};

      const response = await handleAssignedIssues(request, userRecord);
      t.is(response.statusCode, 200, 'Response status code');
      if ('error' in response) {
        throw new Error('Expected a data response');
      }
      t.deepEqual(response.data.issues, [
        {
          id: '123',
          title: 'test-title',
          repo: 'test-repo',
          owner: 'test-owner',
          author: 'test-user',
          avatarUrl: 'https://example.com/test-image.png',
          createdAt: 2,
          url: 'https://example.com/test/url',
          popularity: 1 as Popularity,
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
          popularity: 1 as Popularity,
          hasNewActivity: false,
          status: {type: 'Assigned'},
        },
      ]);
    });

test.serial(
    '[assignedIssues]: should handle when an issue has no last activity (i.e. author of issue is the current user)',
    async (t) => {
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

      const userRecord = newFakeUserRecord();
      userRecord.username = 'test-user';
      const response = await handleAssignedIssues(newFakeRequest(), userRecord);
      t.is(response.statusCode, 200, 'Response status code');
      if ('error' in response) {
        throw new Error('Expected a data response');
      }

      t.deepEqual(response.data.issues, [{
                    id: '123',
                    title: 'test-title',
                    repo: 'test-repo',
                    owner: 'test-owner',
                    author: 'test-user',
                    avatarUrl: 'https://example.com/test-image.png',
                    createdAt: 2,
                    url: 'https://example.com/test/url',
                    popularity: 1 as Popularity,
                    hasNewActivity: false,
                    status: {type: 'Assigned'},
                  }]);
    });

test.serial(
    '[issueActivity]: should retrieve issues for a user (Using replays)',
    async (t) => {
      const userRecord = newFakeUserRecord();
      userRecord.username = 'project-health1';

      const response = await handleActivityIssues(newFakeRequest(), userRecord);
      t.is(response.statusCode, 200, 'Response status code');
      if ('error' in response) {
        throw new Error('Expected a data response');
      }
      t.deepEqual(response.data.issues, []);
    });

test.serial(
    '[issueActivity]: should return Involved status types', async (t) => {
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

      const userRecord = newFakeUserRecord();
      const response = await handleActivityIssues(newFakeRequest(), userRecord);
      t.is(response.statusCode, 200, 'Response status code');
      if ('error' in response) {
        throw new Error('Expected a data response');
      }
      t.deepEqual(response.data.issues, [{
                    id: '123',
                    title: 'test-title',
                    repo: 'test-repo',
                    owner: 'test-owner',
                    author: 'test-user',
                    avatarUrl: 'https://example.com/test-image.png',
                    createdAt: 2,
                    url: 'https://example.com/test/url',
                    popularity: 1 as Popularity,
                    hasNewActivity: false,
                    status: {type: 'Involved'},
                  }]);
    });

test.serial('[issueActivity]: should return Author status types', async (t) => {
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

  const userRecord = newFakeUserRecord();
  userRecord.username = 'example-user';
  const response = await handleActivityIssues(newFakeRequest(), userRecord);
  t.is(response.statusCode, 200, 'Response status code');
  if ('error' in response) {
    throw new Error('Expected a data response');
  }
  t.deepEqual(response.data.issues, [{
                id: '123',
                title: 'test-title',
                repo: 'test-repo',
                owner: 'test-owner',
                author: 'example-user',
                avatarUrl: 'https://example.com/test-image.png',
                createdAt: 2,
                url: 'https://example.com/test/url',
                popularity: 1 as Popularity,
                hasNewActivity: false,
                status: {type: 'Author'},
              }]);
});

test.serial(
    '[untriagedIssues]: should retrieve untriaged issues for a repo',
    async (t) => {
      const userRecord = newFakeUserRecord();
      userRecord.username = 'project-health1';

      const request = newFakeRequest();
      request.params = {owner: 'project-health1', repo: 'repo'};

      const response = await handleUntriagedIssues(request, userRecord);
      t.is(response.statusCode, 200, 'Response status code');
      if ('error' in response) {
        throw new Error('Expected a data response');
      }
      t.deepEqual(response.data, {
        issues: [
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
            status: {type: 'Untriaged'},
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
            status: {type: 'Untriaged'},
          },
        ]
      });
    });

test.serial('[issueLabels]: gets all used labels for a repo', async (t) => {
  const userRecord = newFakeUserRecord();
  userRecord.username = 'project-health1';

  const request = newFakeRequest();
  request.params = {owner: 'project-health1', repo: 'repo'};

  const response = await handleLabels(request, userRecord);
  t.is(response.statusCode, 200, 'Response status code');
  if ('error' in response) {
    throw new Error('Expected a data response');
  }
  t.deepEqual(
      response.data, {labels: [{description: 'Serious issues', name: 'bug'}]});
});

test.serial('[issueGetByLabel]: should retrieve issue by label', async (t) => {
  const userRecord = newFakeUserRecord();
  userRecord.username = 'project-health1';

  const request = newFakeRequest();
  request.params = {owner: 'project-health1', repo: 'repo', labels: 'bug'};

  const response = await handleByLabel(request, userRecord);
  t.is(response.statusCode, 200, 'Response status code');
  if ('error' in response) {
    throw new Error('Expected a data response');
  }
  t.deepEqual(response.data, {
    issues: [
      {
        id: 'MDU6SXNzdWUzMTY0NTU0NTM=',
        title: 'Issue with label',
        repo: 'repo',
        owner: 'project-health1',
        author: 'project-health1',
        avatarUrl: 'https://avatars3.githubusercontent.com/u/34584679?v=4',
        createdAt: 1524279150000,
        url: 'https://github.com/project-health1/repo/issues/18',
        popularity: 1,
        hasNewActivity: false,
        status: {type: 'Unassigned'},
      },
    ]
  });
});

// TODO: GitHub's API doesn't currently support filtering issues with no labels
// out.
test.failing('[issueGetByLabel]: supports no labels', async (t) => {
  const userRecord = newFakeUserRecord();
  userRecord.username = 'project-health1';

  const request = newFakeRequest();
  request.params = {owner: 'project-health1', repo: 'repo', labels: ''};

  const response = await handleByLabel(request, userRecord);
  t.is(response.statusCode, 200, 'Response status code');
  if ('error' in response) {
    throw new Error('Expected a data response');
  }

  t.is(response.data.issues.length, 1);
});
