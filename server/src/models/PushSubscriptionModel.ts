class PushSubscription {
  endpoint: string;
  expirationTime: number|null;
  keys: {p256dh: string; auth: string;};
}

class PubSubscriptionInfo {
  subscription: PushSubscription;
  supportedContentEncodings: string[];
}

export class PushSubscriptionModel {
  private pushSubscriptions: {[id: string]: Set<PubSubscriptionInfo>};

  constructor() {
    this.pushSubscriptions = {};
  }

  addPushSubscription(
      userId: string,
      subscription: PushSubscription,
      supportedContentEncodings: string[]) {
    if (!this.pushSubscriptions[userId]) {
      this.pushSubscriptions[userId] = new Set();
    }
    this.pushSubscriptions[userId].add({
      subscription,
      supportedContentEncodings,
    });
  }
}
