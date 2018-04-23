import {Firestore} from '@google-cloud/firestore';
import * as fs from 'fs-extra';
import * as path from 'path';
import {getFirestoreMock} from '../test/fake-firestore';

let firestoreSingleton: Firestore|null = null;

export function firestore(): Firestore {
  if (!firestoreSingleton) {
    throw new Error('Firestore is not initialised.');
  }
  return firestoreSingleton;
}

export function initFirestore() {
  if (firestoreSingleton) {
    throw new Error('Firestore is already initialised.');
  }

  if (process.env.NODE_ENV === 'test') {
    firestoreSingleton = getFirestoreMock();
    return firestoreSingleton;
  }

  if (process.env.NODE_ENV !== 'production') {
    // See https://cloud.google.com/docs/authentication/production
    let firestoreKeyFile;
    const projectRoot = path.join(__dirname, '..', '..');
    for (const file of fs.readdirSync(projectRoot)) {
      if (file.match(/^github-health-.*\.json$/)) {
        firestoreKeyFile = path.join(projectRoot, file);
        break;
      }
    }

    if (!firestoreKeyFile) {
      throw new Error('Tests can only run with a staging key for Firestore.');
    }

    firestoreSingleton = new Firestore({
      keyFile: firestoreKeyFile,
    });
  } else {
    // AppEngine has env variables that configure Firestore
    firestoreSingleton = new Firestore();
  }
}
