import {firestore} from '../../utils/firestore';

const HOOK_COLLECTION_NAME = 'github-event-deliveries';

export const HOOK_MAX_AGE = 60 * 1000;

class HooksModel {
  /**
   * This method may be called multiple times in quick succession resulting
   * in a the doc already existing.
   */
  async logHook(hookDelivery: string): Promise<boolean> {
    const hookDoc =
        await firestore().collection(HOOK_COLLECTION_NAME).doc(hookDelivery);
    try {
      await hookDoc.create({received: true, timestamp: Date.now()});
      return true;
    } catch (err) {
      if (err.message.indexOf('Document already exists') !== -1) {
        return false;
      }
      throw err;
    }
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
