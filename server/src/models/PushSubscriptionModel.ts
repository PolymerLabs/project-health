class PushSubscription {
  endpoint: string;
  expirationTime: number|null;
  keys: {p256dh: string; auth: string;};
}

class PushSubscriptionInfo {
  subscription: PushSubscription;
  supportedContentEncodings: string[];
}

export class PushSubscriptionModel {
  private pushSubscriptions:
      {[id: string]: {[endpoint: string]: PushSubscriptionInfo}};

  constructor() {
    this.pushSubscriptions = {};
  }

  addPushSubscription(
      userId: string,
      subscription: PushSubscription,
      supportedContentEncodings: string[]) {
    if (!this.pushSubscriptions[userId]) {
      this.pushSubscriptions[userId] = {};
    }
    this.pushSubscriptions[userId][subscription.endpoint] = {
      subscription,
      supportedContentEncodings,
    };
  }

  removePushSubscription(userId: string, subscription: PushSubscription) {
    if (!this.pushSubscriptions[userId]) {
      return;
    }

    delete this.pushSubscriptions[userId][subscription.endpoint];
  }

  getSubscriptionsForUser(userId: string):
      {[endpoint: string]: PushSubscriptionInfo}|null {
    if (!this.pushSubscriptions[userId]) {
      return null;
    }

    if (Object.keys(this.pushSubscriptions[userId]).length === 0) {
      return null;
    }

    return this.pushSubscriptions[userId];
  }
}
