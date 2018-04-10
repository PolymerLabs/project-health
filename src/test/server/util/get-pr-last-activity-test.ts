import anyTest, {TestInterface} from 'ava';
import * as sinon from 'sinon';
import {SinonSandbox} from 'sinon';

import {getPRLastActivity} from '../../../server/utils/get-pr-last-activity';
import {initFirestore} from '../../../utils/firestore';
import {newFakePR} from '../../utils/newFakePR';

type TestContext = {
  sandbox: SinonSandbox,
};
const test = anyTest as TestInterface<TestContext>;

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
    '[getPRLastActivity]: should return PR creation timestamp', async (t) => {
      const pr = newFakePR();
      const activity = await getPRLastActivity('example-username', pr);
      t.deepEqual(activity, 0, 'PR last activity result');
    });

test.serial(
    '[getPRLastActivity]: should return PR last event timestamp', async (t) => {
      const pr = newFakePR();
      pr.events = [
        {
          type: 'MentionedEvent',
          mentionedAt: 1,
          text: 'Example text',
          url: 'http://example.com/',
        },
        {
          type: 'MentionedEvent',
          mentionedAt: 2,
          text: 'Example text',
          url: 'http://example.com/',
        }
      ];
      const activity = await getPRLastActivity('example-username', pr);
      t.deepEqual(activity, 2, 'PR last activity result');
    });

test.serial(
    '[getPRLastActivity]: should return PR creation event timestamp of OutgoingReviewEvent with no reviews',
    async (t) => {
      const pr = newFakePR();
      pr.events = [{type: 'OutgoingReviewEvent', reviews: []}];
      const activity = await getPRLastActivity('example-username', pr);
      t.deepEqual(activity, 0, 'PR last activity result');
    });

test.serial(
    '[getPRLastActivity]: should return PR event timestamp of OutgoingReviewEvent with reviews',
    async (t) => {
      const pr = newFakePR();
      pr.events = [{
        type: 'OutgoingReviewEvent',
        reviews: [{
          author: 'example',
          createdAt: 1,
          reviewState: 'DISMISSED',
        }]
      }];
      const activity = await getPRLastActivity('example-username', pr);
      t.deepEqual(activity, 1, 'PR last activity result');
    });

test.serial(
    '[getPRLastActivity]: should return null for event with MyReviewEvent for current user',
    async (t) => {
      const pr = newFakePR();
      pr.events = [{
        type: 'MyReviewEvent',
        review: {
          author: 'example-username',
          createdAt: 1,
          reviewState: 'DISMISSED',
        },
      }];
      const activity = await getPRLastActivity('example-username', pr);
      t.deepEqual(activity, null, 'PR last activity result');
    });

test.serial(
    '[getPRLastActivity]: should return activity for MyReviewEvent for a different user',
    async (t) => {
      const pr = newFakePR();
      pr.events = [{
        type: 'MyReviewEvent',
        review: {
          author: 'other-username',
          createdAt: 1,
          reviewState: 'DISMISSED',
        },
      }];
      const activity = await getPRLastActivity('example-username', pr);
      t.deepEqual(activity, 1, 'PR last activity result');
    });

test.serial(
    '[getPRLastActivity]: should return activity for NewCommitsEvent for a different user',
    async (t) => {
      const pr = newFakePR();
      pr.events = [{
        type: 'NewCommitsEvent',
        count: 0,
        additions: 0,
        deletions: 0,
        changedFiles: 0,
        lastPushedAt: 1,
        url: 'http://example.com'
      }];
      const activity = await getPRLastActivity('example-username', pr);
      t.deepEqual(activity, 1, 'PR last activity result');
    });

test.serial(
    '[getPRLastActivity]: should return createdAt for an unknown event type',
    async (t) => {
      const pr = newFakePR();
      pr.events = [{
        type: 'Other event',
        // tslint:disable-next-line:no-any
      } as any];
      const activity = await getPRLastActivity('example-username', pr);
      t.deepEqual(activity, 0, 'PR last activity result');
    });

test.serial(
    '[getPRLastActivity]: should return activity for NewCommitsEvent with older comment',
    async (t) => {
      const pr = newFakePR();
      pr.events = [{
        type: 'NewCommitsEvent',
        count: 0,
        additions: 0,
        deletions: 0,
        changedFiles: 0,
        lastPushedAt: 2,
        url: 'http://example.com'
      }];
      const lastComment = {
        createdAt: 1,
        author: 'example-username',
      };
      const activity =
          await getPRLastActivity('example-username', pr, lastComment);
      t.deepEqual(activity, 2, 'PR last activity result');
    });

test.serial(
    '[getPRLastActivity]: should return new comment timestamp', async (t) => {
      const pr = newFakePR();
      pr.events = [{
        type: 'NewCommitsEvent',
        count: 0,
        additions: 0,
        deletions: 0,
        changedFiles: 0,
        lastPushedAt: 1,
        url: 'http://example.com'
      }];
      const lastComment = {
        createdAt: 2,
        author: 'diff-username',
      };
      const activity =
          await getPRLastActivity('example-username', pr, lastComment);
      t.deepEqual(activity, 2, 'PR last activity result');
    });

test.serial(
    '[getPRLastActivity]: should return null for comment timestamp if the author made the comment',
    async (t) => {
      const pr = newFakePR();
      pr.events = [{
        type: 'NewCommitsEvent',
        count: 0,
        additions: 0,
        deletions: 0,
        changedFiles: 0,
        lastPushedAt: 1,
        url: 'http://example.com'
      }];
      const lastComment = {
        createdAt: 2,
        author: 'example-username',
      };
      const activity =
          await getPRLastActivity('example-username', pr, lastComment);
      t.deepEqual(activity, null, 'PR last activity result');
    });
