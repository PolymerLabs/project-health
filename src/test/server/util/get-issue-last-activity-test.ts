import anyTest, {TestInterface} from 'ava';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {getIssueLastActivity} from '../../../server/utils/get-issue-last-activity';
import {commentFieldsFragment} from '../../../types/gql-types';
import {initFirestore} from '../../../utils/firestore';

type TestContext = {
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

function newFakeIssue(): commentFieldsFragment {
  const commentFields: commentFieldsFragment = {
    __typename: 'Issue',
    createdAt: '2017-03-15T02:33:10Z',
    author: {
      __typename: 'User',
      login: 'test-author-login',
      avatarUrl: 'https://example.com/avatar/url.png',
    },
    comments: {
      __typename: 'IssueCommentConnection',
      nodes: [{
        __typename: 'IssueComment',
        createdAt: '2017-03-15T01:33:10Z',
        author: {
          __typename: 'User',
          login: 'test-comment-login',
        },
      }],
    },
  };

  return Object.assign({}, commentFields);
}

test.before(() => {
  initFirestore();
});

test.beforeEach(async (t) => {
  t.context = {
    sandbox: sinon.sandbox.create(),
  };
});

test.afterEach((t) => {
  t.context.sandbox.restore();
});

test.serial(
    '[getIssueLastActivity]: should return null for user authored issue with no comments',
    async (t) => {
      const fakeIssue = newFakeIssue();
      fakeIssue.author = {
        __typename: 'User',
        login: 'example-username',
        avatarUrl: 'https://example.com/avatar/url.png',
      };
      fakeIssue.comments.nodes = [];
      const activity =
          await getIssueLastActivity('example-username', fakeIssue);
      t.deepEqual(activity, null, 'issue has new activity result');
    });

test.serial(
    '[getIssueLastActivity]: should return comment timestamp', async (t) => {
      const activity =
          await getIssueLastActivity('example-username', newFakeIssue());
      t.deepEqual(activity, 1489541590000, 'issue has new activity result');
    });

test.serial(
    '[getIssueLastActivity]: should return updatedOn timestamp when undefined comment nodes',
    async (t) => {
      const issue = newFakeIssue();
      delete issue.comments.nodes;
      const activity = await getIssueLastActivity('example-username', issue);
      t.deepEqual(activity, 1489545190000, 'issue has new activity result');
    });

test.serial(
    '[getIssueLastActivity]: should return updatedOn timestamp when empty comment nodes',
    async (t) => {
      const issue = newFakeIssue();
      issue.comments.nodes = [];
      const activity = await getIssueLastActivity('example-username', issue);
      t.deepEqual(activity, 1489545190000, 'issue has new activity result');
    });

test.serial(
    '[getIssueLastActivity]: should return updatedOn timestamp when null comment node',
    async (t) => {
      const issue = newFakeIssue();
      issue.comments.nodes = [null];
      const activity = await getIssueLastActivity('example-username', issue);
      t.deepEqual(activity, 1489545190000, 'issue has new activity result');
    });

test.serial(
    '[getIssueLastActivity]: should return null when last comment is assignee',
    async (t) => {
      const issue = newFakeIssue();
      issue.comments.nodes = [{
        __typename: 'IssueComment',
        createdAt: '2017-03-15T01:33:10Z',
        author: {
          __typename: 'User',
          login: 'example-username',
        },
      }];
      const activity = await getIssueLastActivity('example-username', issue);
      t.deepEqual(activity, null, 'issue has new activity result');
    });

test.serial(
    '[getIssueLastActivity]: should throw for multiple comments', async (t) => {
      const issue = newFakeIssue();
      issue.comments.nodes = [
        {
          __typename: 'IssueComment',
          createdAt: '2017-03-15T01:33:10Z',
          author: {
            __typename: 'User',
            login: 'example-username',
          },
        },
        {
          __typename: 'IssueComment',
          createdAt: '2017-03-15T01:33:10Z',
          author: {
            __typename: 'User',
            login: 'example-username',
          },
        }
      ];
      await t.throws(async () => {
        await getIssueLastActivity('example-username', issue);
      });
    });
