import * as fse from 'fs-extra';
import * as path from 'path';

import * as webhooks from '../../types/webhooks';

import {NotificationsSent} from './notifications';

export interface WebhookListenerResponse {
  id: string;
  notifications: NotificationsSent[];
}

export interface WebhookListener {
  handleWebhookEvent(payload: webhooks.WebhookPayload):
      Promise<WebhookListenerResponse|null>;
}

export class WebhooksController {
  private eventsToListener =
      new Map<webhooks.WebhookType, Set<WebhookListener>>();

  constructor() {
    this.loadControllers('webhook-handlers');
    this.loadControllers('webhook-handlers/notifications');
    this.loadControllers('webhook-handlers/updaters');
  }

  private loadControllers(dir: string) {
    const dirPath = path.join(__dirname, dir);
    const files = fse.readdirSync(dirPath);
    for (const file of files) {
      if (path.extname(file) === '.js') {
import(path.join(dirPath, file));
      }
    }
  }

  /**
   * Subscribes the listener to the specified events.
   */
  addListener(
      events: webhooks.WebhookType|webhooks.WebhookType[],
      listener: WebhookListener) {
    if (typeof events === 'string') {
      events = [events];
    }

    for (const e of events) {
      if (this.eventsToListener.has(e)) {
        this.eventsToListener.get(e)!.add(listener);
      } else {
        this.eventsToListener.set(e, new Set([listener]));
      }
    }
  }

  /**
   * Unsubscribes the listener from all events.
   */
  removeListener(listener: WebhookListener) {
    for (const listeners of this.eventsToListener.values()) {
      listeners.delete(listener);
    }
  }

  /**
   * Takes a given webhook event and sends them to subscribed listeners.
   */
  async handleWebhookEvent(payload: webhooks.WebhookPayload):
      Promise<WebhookListenerResponse[]> {
    if (!this.eventsToListener.has(payload.type)) {
      return [];
    }

    const responses = [];
    for (const listener of this.eventsToListener.get(payload.type)!) {
      const response = await listener.handleWebhookEvent(payload);
      if (response) {
        responses.push(response);
      }
    }
    return responses;
  }
}

export const webhooksController = new WebhooksController();
