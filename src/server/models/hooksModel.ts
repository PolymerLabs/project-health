import {firestore} from '../../utils/firestore';

const HOOK_COLLECTION_NAME = 'github-hooks';

// 1 Hour to allow some debugging time if needed.
export const HOOK_MAX_AGE = 60 * 60 * 1000;

class HooksModel {
  async isNewHook(hookDelivery: string): Promise<boolean> {
    const hookDoc = await firestore()
                        .collection(HOOK_COLLECTION_NAME)
                        .doc(hookDelivery)
                        .get();
    return !hookDoc.exists;
  }

  async logHook(hookDelivery: string):
      Promise<void> {  // TODO Log hook in collection
    const hookDoc =
        await firestore().collection(HOOK_COLLECTION_NAME).doc(hookDelivery);
    await hookDoc.create({received: true, timestamp: Date.now()});
  }

  async cleanHooks() {
    // Search for hooks older than a minute and delete them
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
