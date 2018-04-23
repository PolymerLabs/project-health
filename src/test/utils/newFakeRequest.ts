import {Request} from 'express';

export function newFakeRequest() {
  const fakeRequest = {
    body: {},
    params: {},
    query: {},
  } as Request;
  return Object.assign({}, fakeRequest);
}
