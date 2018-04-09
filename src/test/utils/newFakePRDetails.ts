import {PullRequestDetails} from '../../server/utils/get-pr-from-commit';

export function newFakePullRequestDetails() {
  const fakeDetails: PullRequestDetails = {
    gqlId: 'test-pr-id',
    number: 1,
    title: 'test-title',
    body: 'test-body',
    url: 'http://test-url.com',
    owner: 'test-owner',
    repo: 'test-repo',
    author: 'test-pr-author',
    state: 'OPEN',
    commit: {
      oid: 'test-commit-SHA',
      state: 'PENDING',
    },
    headRef: {
      id: 'head-ref-id-1234',
      name: 'branch-name',
      prefix: 'refs/heads/',
    }
  };

  return Object.assign({}, fakeDetails);
}
