import {test} from 'ava';
import * as express from 'express';

import {handleSetMergeOpt} from '../../../server/apis/auto-merge';
import {initFirestore} from '../../../utils/firestore';

function newFakeRequest() {
  const fakeResponse = {
    body: {
      owner: 'example-owner',
      repo: 'example-repo',
      number: 123,
      automergeOption: 'merge',
    }
  };

  return Object.assign({}, fakeResponse);
}

test.before(() => {
  initFirestore();
});

test('[auto-merge-api]: should error for no merge option', async (t) => {
  const request = newFakeRequest();
  delete request.body.automergeOption;
  const response = await handleSetMergeOpt(request as express.Request);
  if (!('error' in response)) {
    throw new Error('Expected error response');
  }
  t.deepEqual(response.error.code, 'no-automerge-option');
  t.deepEqual(response.statusCode, 400, 'HTTP STatus Code');
});

test('[auto-merge-api]: should error for no owner', async (t) => {
  const request = newFakeRequest();
  delete request.body.owner;
  const response = await handleSetMergeOpt(request as express.Request);
  if (!('error' in response)) {
    throw new Error('Expected error response');
  }
  t.deepEqual(response.error.code, 'no-owner');
  t.deepEqual(response.statusCode, 400, 'HTTP STatus Code');
});

test('[auto-merge-api]: should error for no repo', async (t) => {
  const request = newFakeRequest();
  delete request.body.repo;
  const response = await handleSetMergeOpt(request as express.Request);
  if (!('error' in response)) {
    throw new Error('Expected error response');
  }
  t.deepEqual(response.error.code, 'no-repo');
  t.deepEqual(response.statusCode, 400, 'HTTP STatus Code');
});

test('[auto-merge-api]: should error for no PR number', async (t) => {
  const request = newFakeRequest();
  delete request.body.number;
  const response = await handleSetMergeOpt(request as express.Request);
  if (!('error' in response)) {
    throw new Error('Expected error response');
  }
  t.deepEqual(response.error.code, 'no-pr-number');
  t.deepEqual(response.statusCode, 400, 'HTTP STatus Code');
});

test(
    '[auto-merge-api]: should save auto merge options for valid request',
    async (t) => {
      const request = newFakeRequest();
      const response = await handleSetMergeOpt(request as express.Request);
      if (!('data' in response)) {
        throw new Error('Expected data response');
      }
      t.deepEqual(response.data.status, 'ok');
      t.deepEqual(response.statusCode, 200, 'HTTP STatus Code');
    });
