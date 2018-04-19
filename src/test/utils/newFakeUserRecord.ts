import {REQUIRED_SCOPES, UserRecord} from '../../server/models/userModel';
import {getTestTokens} from '../get-test-tokens';

export const FAKE_USERNAME = 'fake-username';

export function newFakeUserRecord() {
  const fakeRecord: UserRecord = {
    username: FAKE_USERNAME,
    githubToken: getTestTokens()['project-health1'] || 'fake-token',
    scopes: REQUIRED_SCOPES,
    avatarUrl: 'https://avatars2.githubusercontent.com/u/34584679?s=400&v=4',
    fullname: 'Fakey McFakeFace',
    lastKnownUpdate: null,
    featureLastViewed: {
      enabledAt: Date.now(),
    },
    repos: null,
  };

  return Object.assign({}, fakeRecord);
}
