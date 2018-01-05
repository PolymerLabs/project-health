class PushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PubscriptionInfo {
  subscription: PushSubscription;
  supportedContentEncodings: string[];
}

class PushSubscriptionModel {
  private pushSubscriptions: {[id: string]: PubscriptionInfo[]};

  constructor() {
    this.pushSubscriptions = {};
  }

  addPushSubscription(userId: string, subscription: PushSubscription, supportedContentEncodings: string[]) {
    if (!this.pushSubscriptions[userId]) {
      this.pushSubscriptions[userId] = [];
    }
    this.pushSubscriptions[userId].push({
      subscription,
      supportedContentEncodings,
    });
  }
}

export { PushSubscriptionModel };
