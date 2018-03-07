import {firestore} from '../../utils/firestore';

const HOOK_COLLECTION_NAME = 'github-event-deliveries';

export const HOOK_MAX_AGE = 10 * 60 * 1000;

class HooksModel {
  async isNewHook(hookDelivery: string): Promise<boolean> {
    const hookDoc = await firestore()
                        .collection(HOOK_COLLECTION_NAME)
                        .doc(hookDelivery)
                        .get();
    return !hookDoc.exists;
  }

  async logHook(hookDelivery: string): Promise<void> {
    const hookDoc =
        await firestore().collection(HOOK_COLLECTION_NAME).doc(hookDelivery);
    await hookDoc.set({received: true, timestamp: Date.now()});
  }

  async cleanHooks() {
    const querySnapshot =
        await firestore()
            .collection(HOOK_COLLECTION_NAME)
            .where('timestamp', '<', Date.now() - HOOK_MAX_AGE)
            .get();
    const batch = firestore().batch();
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  async deleteHook(hookDelivery: string) {
    await firestore()
        .collection(HOOK_COLLECTION_NAME)
        .doc(hookDelivery)
        .delete();
  }
}

export const hooksModel = new HooksModel();
