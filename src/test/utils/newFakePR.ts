import {PullRequest} from '../../types/api';

export function newFakePR() {
  const fakeDetails: PullRequest = {
    id: 'test-pr-id',
    repo: 'test-repo',
    owner: 'test-owner',
    number: 1,
    title: 'test-title',
    url: 'http://example.com/test/',
    author: 'test-author',
    createdAt: 0,
    avatarUrl: 'https://example.com/avatar.png',
    status: {
      type: 'UnknownStatus',
    },
    events: [],
    hasNewActivity: false,
  };
  return Object.assign({}, fakeDetails);
}
