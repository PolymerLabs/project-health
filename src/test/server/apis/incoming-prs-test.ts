import anyTest, {TestInterface} from 'ava';

import {handleIncomingPRRequest} from '../../../server/apis/dash-data/handle-incoming-pr-request';
import {IncomingDashResponse, PullRequest} from '../../../types/api';
import {PullRequestReviewState} from '../../../types/gql-types';
import {initFirestore} from '../../../utils/firestore';
import {initGithub} from '../../../utils/github';
import {newFakeRequest} from '../../utils/newFakeRequest';
import {newFakeUserRecord} from '../../utils/newFakeUserRecord';
import {startTestReplayServer} from '../../utils/replay-server';

type TestContext = {
  data: IncomingDashResponse,
  prsById: Map<string, PullRequest>,
};
const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  initFirestore();
});

/**
 * Generates the test context object before each test.
 */
test.beforeEach(async (t) => {
  const {server, url} =
      await startTestReplayServer(t, 'project-health1-dashboard incoming');
  initGithub(url, url);

  const userRecord = newFakeUserRecord();
  userRecord.username = 'project-health1';
  const response = await handleIncomingPRRequest(newFakeRequest(), userRecord);
  server.close();

  const prsById = new Map();
  for (const pr of response.data.prs) {
    prsById.set(
        pr.url.replace('https://github.com/project-health1/repo/pull/', ''),
        pr);
  }
  t.context = {
    data: response.data,
    prsById,
  };
});

test('[incoming-prs-test]: sane output', (t) => {
  const data = t.context.data;
  // Make sure a test is added each time these numbers are changed.
  t.is(data.prs.length, 8);
});

test('[incoming-prs-test]: events are always sorted correctly', (t) => {
  const data = t.context.data;
  for (const pr of data.prs) {
    let lastTime = 0;
    for (const event of pr.events) {
      if (event.type === 'MentionedEvent') {
        t.true(event.mentionedAt > lastTime, 'Event not ordered correctly');
        lastTime = event.mentionedAt;
      } else if (event.type === 'NewCommitsEvent') {
        t.true(event.lastPushedAt > lastTime, 'Event not ordered correctly');
        lastTime = event.lastPushedAt;
      } else if (event.type === 'MyReviewEvent') {
        t.true(
            event.review.createdAt > lastTime, 'Event not ordered correctly');
        lastTime = event.review.createdAt;
      }
    }
  }
});

test('[incoming-prs-test]: incoming PRs are ordered', (t) => {
  const prs = t.context.data.prs;

  // Actionable status items appear before non actionable ones.
  const notActionable = [
    'ChangesRequested',
    'UnknownStatus',
    'NoActionRequired',
    'NewActivity',
    'StatusChecksPending'
  ];

  // Find first non-actionable.
  let index = 0;
  while (index < prs.length &&
         !notActionable.includes(prs[index].status.type)) {
    index++;
  }

  const firstNonActionableIndex = index;

  // Make sure the rest are not actionable.
  while (index < prs.length) {
    t.true(
        notActionable.includes(prs[index].status.type),
        `Found actionable item after a non-actionable item. Actionable item: ${
            prs[index].status.type}`);
    index++;
  }

  function getLatestEventTime(pr: PullRequest) {
    let latest = pr.createdAt;
    for (const event of pr.events) {
      switch (event.type) {
        case 'NewCommitsEvent':
          if (event.lastPushedAt > latest) {
            latest = event.lastPushedAt;
          }
          break;
        case 'MentionedEvent':
          if (event.mentionedAt > latest) {
            latest = event.mentionedAt;
          }
          break;
        case 'MyReviewEvent':
          // Ignore my review events. Shouldn't impact ordering since it's an
          // event generated by you.
          break;
        default:
          break;
      }
    }
    return latest;
  }

  // Ensure actionable items are sorted.
  let latest = getLatestEventTime(prs[0]);
  for (let i = 1; i < firstNonActionableIndex; i++) {
    const newTime = getLatestEventTime(prs[i]);
    t.true(
        newTime <= latest, 'Actionable PRs not sorted by latest event times');
    latest = newTime;
  }

  // Ensure non-actionable items are sorted.
  latest = getLatestEventTime(prs[firstNonActionableIndex]);
  for (let i = firstNonActionableIndex + 1; i < prs.length; i++) {
    const newTime = getLatestEventTime(prs[i]);
    t.true(
        newTime <= latest,
        'Non-actionable PRs not sorted by latest event times');
    latest = newTime;
  }
});

test(
    '[incoming-prs-test]: Incoming PR with old @mention before I reviewed',
    (t) => {
      t.deepEqual(t.context.prsById.get('11'), {
        id: 'MDExOlB1bGxSZXF1ZXN0MTY3ODI2Mzk1',
        author: 'project-health2',
        avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
        createdAt: 1518042329000,
        events: [
          {
            review: {
              author: 'project-health1',
              createdAt: 1518042376000,
              reviewState: PullRequestReviewState.COMMENTED,
            },
            type: 'MyReviewEvent',
          },
        ],
        number: 11,
        owner: 'project-health1',
        repo: 'repo',
        status: {
          type: 'ApprovalRequired',
        },
        title: 'A new pull request',
        url: 'https://github.com/project-health1/repo/pull/11',
        hasNewActivity: false,
      });
    });

test('[incoming-prs-test]: Incoming PR with new @mention after I reviewed', (t) => {
  t.deepEqual(t.context.prsById.get('10'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTY3Nzg1NjAw',
    author: 'project-health2',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
    createdAt: 1518031465000,
    events: [
      {
        review: {
          author: 'project-health1',
          createdAt: 1518031566000,
          reviewState: PullRequestReviewState.APPROVED,
        },
        type: 'MyReviewEvent',
      },
      {
        type: 'MentionedEvent',
        text: '@project-health1 what do you mean?',
        mentionedAt: 1518031578000,
        url:
            'https://github.com/project-health1/repo/pull/10#discussion_r166728166',
      }
    ],
    number: 10,
    owner: 'project-health1',
    repo: 'repo',
    status: {
      type: 'NoActionRequired',
    },
    title: 'Questionable changes',
    url: 'https://github.com/project-health1/repo/pull/10',
    hasNewActivity: false,
  });
});

test('[incoming-prs-test]: Incoming PR that I reviewed. New commit since', (t) => {
  t.deepEqual(t.context.prsById.get('9'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTY2MzUxNTky',
    author: 'project-health2',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
    createdAt: 1517426339000,
    events: [
      {
        review: {
          author: 'project-health1',
          createdAt: 1517426375000,
          reviewState: PullRequestReviewState.CHANGES_REQUESTED,
        },
        type: 'MyReviewEvent',
      },
      {
        type: 'NewCommitsEvent',
        count: 1,
        additions: 1,
        deletions: 1,
        changedFiles: 1,
        lastPushedAt: 1517426399000,
        url:
            'https://github.com/project-health1/repo/pull/9/files/4eb760bbbeb1e9b5ee51010050fca4d1f2fe5dbb..bf67264ad3d77fcd9ad43cfcc13c8578fb9f57de',
      }
    ],
    number: 9,
    owner: 'project-health1',
    repo: 'repo',
    status: {
      type: 'ApprovalRequired',
    },
    title: 'Update links in readme',
    url: 'https://github.com/project-health1/repo/pull/9',
    hasNewActivity: false,
  });
});

test('[incoming-prs-test]: Incoming PR, I requested changes', (t) => {
  t.deepEqual(t.context.prsById.get('3'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTY0NzE5MzU4',
    author: 'project-health2',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
    createdAt: 1516750523000,
    number: 3,
    owner: 'project-health1',
    repo: 'repo',
    title: 'A couple minor changes for browserify compatibility',
    url: 'https://github.com/project-health1/repo/pull/3',
    status: {type: 'ChangesRequested'},
    events: [{
      type: 'MyReviewEvent',
      review: {
        author: 'project-health1',
        createdAt: 1516753105000,
        reviewState: PullRequestReviewState.CHANGES_REQUESTED,
      }
    }],
    hasNewActivity: false,
  });
});

test('[incoming-prs-test]: Incoming review request', (t) => {
  t.deepEqual(t.context.prsById.get('4'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTY0NzI1NzUw',
    author: 'project-health2',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
    createdAt: 1516753159000,
    number: 4,
    owner: 'project-health1',
    repo: 'repo',
    title: 'Add a field for getting the template of an element',
    url: 'https://github.com/project-health1/repo/pull/4',
    status: {type: 'ReviewRequired'},
    events: [],
    hasNewActivity: false,
  });
});

test('[incoming-prs-test]: incoming with mention, new commits', (t) => {
  t.deepEqual(t.context.prsById.get('13'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTczNjExNzIw',
    author: 'project-health2',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
    createdAt: 1520468329000,
    number: 13,
    owner: 'project-health1',
    repo: 'repo',
    title: 'My changes to readme',
    url: 'https://github.com/project-health1/repo/pull/13',
    status: {type: 'ApprovalRequired'},
    events: [
      {
        review: {
          author: 'project-health1',
          createdAt: 1520468379000,
          reviewState: 'COMMENTED',
        },
        type: 'MyReviewEvent',
      },
      {
        additions: 1,
        changedFiles: 1,
        count: 1,
        deletions: 1,
        lastPushedAt: 1520468415000,
        type: 'NewCommitsEvent',
        url:
            'https://github.com/project-health1/repo/pull/13/files/6b48b7f4a73de3bd5e6f91541941eaec816f2990..6879c9013521c45431a7ac42bf38374510cf5fce',
      },
      {
        mentionedAt: 1520468480000,
        text: '@project-health1 PTAL',
        type: 'MentionedEvent',
        url:
            'https://github.com/project-health1/repo/pull/13#issuecomment-371333354',
      },
    ],
    hasNewActivity: false,
  });
});

test('[incoming-prs-test]: Incoming PR with changes requested', (t) => {
  t.deepEqual(t.context.prsById.get('14'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTc0NDY2NTk5',
    author: 'project-health2',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
    createdAt: 1520881768000,
    events: [
      {
        review: {
          author: 'project-health1',
          createdAt: 1520881787000,
          reviewState: PullRequestReviewState.CHANGES_REQUESTED,
        },
        type: 'MyReviewEvent',
      },
    ],
    number: 14,
    owner: 'project-health1',
    repo: 'repo',
    status: {
      type: 'ChangesRequested',
    },
    title: 'Modify readme description',
    url: 'https://github.com/project-health1/repo/pull/14',
    hasNewActivity: false,
  });
});

test('[incoming-prs-test]: Incoming PR with pending review', (t) => {
  t.deepEqual(t.context.prsById.get('19'), {
    id: 'MDExOlB1bGxSZXF1ZXN0MTg2Nzg2MzE0',
    author: 'project-health2',
    avatarUrl: 'https://avatars3.githubusercontent.com/u/34584974?v=4',
    createdAt: 1525824148000,
    events: [],
    number: 19,
    owner: 'project-health1',
    repo: 'repo',
    status: {
      type: 'ReviewRequired',
    },
    title: 'Pending review',
    url: 'https://github.com/project-health1/repo/pull/19',
    hasNewActivity: false,
  });
});
