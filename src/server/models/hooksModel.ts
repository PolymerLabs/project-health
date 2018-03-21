import {firestore} from '../../utils/firestore';

const HOOK_COLLECTION_NAME = 'github-event-deliveries';

export const HOOK_MAX_AGE = 60 * 1000;

class HooksModel {
  /**
   * This method may be called multiple times in quick succession resulting
   * in a the doc already existing.
   */
  async logHook(hookDelivery: string): Promise<boolean> {
    const hookDocRef =
        await firestore().collection(HOOK_COLLECTION_NAME).doc(hookDelivery);
    return firestore().runTransaction(async (transaction) => {
      const hookDoc = await transaction.get(hookDocRef);
      if (hookDoc.exists) {
        return false;
      }
      await transaction.set(
          hookDocRef, {received: true, timestamp: Date.now()});
      return true;
    });
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
