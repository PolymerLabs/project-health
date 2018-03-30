import {firestore} from '../../utils/firestore';
import {USERS_COLLECTION_NAME} from './userModel';

interface PushSubscription {
  endpoint: string;
  expirationTime: number|null;
  keys: {p256dh: string; auth: string;};
}

interface PushSubscriptionInfo {
  subscription: PushSubscription;
  supportedContentEncodings: string[];
}

/**
 * The structure of the data base is:
 *
 * - users
 *   - <users login>
 *     - subscriptions
 *       - <b64 endpoint>
 *         - subscription
 *         - supportedContentEncodings
 *
 * The base64 endpoint is to allow keying against a subscription. It's encoded
 * since firebase keys cannot contain slashes.
 */
class PushSubscriptionModel {
  private getSubscriptionCollection(login: string) {
    return firestore().collection('users').doc(login).collection(
        'subscriptions');
  }

  private getSubscriptionDoc(login: string, subscription: PushSubscription) {
    const b64Endpoint = new Buffer(subscription.endpoint).toString('base64');
    return firestore()
        .collection(USERS_COLLECTION_NAME)
        .doc(login)
        .collection('subscriptions')
        .doc(b64Endpoint);
  }

  async addPushSubscription(
      login: string,
      subscription: PushSubscription,
      supportedContentEncodings: string[]) {
    const subDoc = this.getSubscriptionDoc(login, subscription);
    await subDoc.set({
      subscription,
      supportedContentEncodings,
    });
  }

  async removePushSubscription(login: string, subscription: PushSubscription) {
    const subDoc = this.getSubscriptionDoc(login, subscription);
    await subDoc.delete();
  }

  async getSubscriptionsForUser(login: string):
      Promise<PushSubscriptionInfo[]> {
    const subCol = this.getSubscriptionCollection(login);
    const querySnapshot = await subCol.get();
    return querySnapshot.docs.map((doc) => {
      return (doc.data() as PushSubscriptionInfo);
    });
  }
}

let subscriptionModel: PushSubscriptionModel;
export function getSubscriptionModel() {
  if (!subscriptionModel) {
    subscriptionModel = new PushSubscriptionModel();
  }
  return subscriptionModel;
}
