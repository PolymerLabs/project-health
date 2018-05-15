import {test} from 'ava';
import * as sinon from 'sinon';

import {WebhookListener, WebhooksController} from '../../../server/controllers/github-app-webhooks';
import * as webhooks from '../../../types/webhooks';

function createFakePayload(type: string) {
  // tslint:disable-next-line:no-any
  return ({type, blah: 'a'} as any) as webhooks.PullRequestPayload;
}

test('[github-app-webhooks] adding a listener works', async (t) => {
  const webhooksController = new WebhooksController();
  const listener: WebhookListener = {
    handleWebhookEvent: (_payload) => {
      return Promise.resolve(null);
    }
  };
  const spy = sinon.spy(listener, 'handleWebhookEvent');
  webhooksController.addListener('create', listener);
  const payload = createFakePayload('create');

  // Send a single payload.
  const response = await webhooksController.handleWebhookEvent(payload);
  t.is(spy.callCount, 1);
  t.true(spy.calledWith(payload));
  t.is(response.length, 0);
});

test('[github-app-webhooks] removing a listener works', async (t) => {
  const webhooksController = new WebhooksController();
  const listener: WebhookListener = {
    handleWebhookEvent: (_payload) => {
      return Promise.resolve(null);
    }
  };
  const spy = sinon.spy(listener, 'handleWebhookEvent');
  const payload = createFakePayload('create');
  webhooksController.addListener('create', listener);
  let response = await webhooksController.handleWebhookEvent(payload);
  t.is(spy.callCount, 1);
  t.is(response.length, 0);

  // Remove and test that no payload is received.
  webhooksController.removeListener(listener);
  response = await webhooksController.handleWebhookEvent(payload);
  t.is(response.length, 0);
  t.is(spy.callCount, 1);
});

test('[github-app-webhooks] adding multiple works', async (t) => {
  const webhooksController = new WebhooksController();
  const listener: WebhookListener = {
    handleWebhookEvent: (_payload) => {
      return Promise.resolve(null);
    }
  };
  const listener2: WebhookListener = {
    handleWebhookEvent: (_payload) => {
      return Promise.resolve({id: 'listener-id', notifications: []});
    }
  };
  const spy = sinon.spy(listener, 'handleWebhookEvent');
  const spy2 = sinon.spy(listener2, 'handleWebhookEvent');
  const payload = createFakePayload('create');

  webhooksController.addListener('create', listener);
  webhooksController.addListener('create', listener2);

  const response = await webhooksController.handleWebhookEvent(payload);
  t.is(spy.callCount, 1);
  t.is(spy2.callCount, 1);
  // Test that responses match those from the handlers.
  t.deepEqual(response, [{id: 'listener-id', notifications: []}]);
});

test('[github-app-webhooks] no listeners added', async (t) => {
  const webhooksController = new WebhooksController();
  const payload = createFakePayload('create');
  const response = await webhooksController.handleWebhookEvent(payload);
  t.deepEqual(response, []);
});
