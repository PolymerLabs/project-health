interface PushSubscription {
  endpoint: string;
  expirationTime: number|null;
  keys: {p256dh: string; auth: string;};
}

interface PushSubscriptionInfo {
  subscription: PushSubscription;
  supportedContentEncodings: string[];
}

class PushSubscriptionModel {
  private pushSubscriptions: {[id: string]: PushSubscriptionInfo[]};

  constructor() {
    this.pushSubscriptions = {};
  }

  addPushSubscription(
      login: string,
      subscription: PushSubscription,
      supportedContentEncodings: string[]) {
    if (!this.pushSubscriptions[login]) {
      this.pushSubscriptions[login] = [];
    }

    this.pushSubscriptions[login].push({
      subscription,
      supportedContentEncodings,
    });
  }

  removePushSubscription(login: string, subscription: PushSubscription) {
    if (!this.pushSubscriptions[login]) {
      return;
    }

    this.pushSubscriptions[login] =
        this.pushSubscriptions[login].filter((value) => {
          return value.subscription.endpoint !== subscription.endpoint;
        });
  }

  getSubscriptionsForUser(login: string): PushSubscriptionInfo[]|null {
    if (!this.pushSubscriptions[login]) {
      return null;
    }

    if (Object.keys(this.pushSubscriptions[login]).length === 0) {
      return null;
    }

    return this.pushSubscriptions[login];
  }
}

export const pushSubscriptionModel = new PushSubscriptionModel();
