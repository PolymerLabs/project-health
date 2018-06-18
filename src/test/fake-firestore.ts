import {Firestore} from '@google-cloud/firestore';

class FakeBatch<T> {
  private docsToDelete: Array<FakeDoc<T>>;

  constructor() {
    this.docsToDelete = [];
  }

  delete(doc: FakeDoc<T>) {
    this.docsToDelete.push(doc);
  }

  async commit() {
    for (const doc of this.docsToDelete) {
      await doc.delete();
    }
  }
}

class FakeQuery<T> {
  private collection: FakeCollection<T>;
  private key: string;
  private test: string;
  private value: T;

  constructor(
      collection: FakeCollection<T>,
      key: string,
      test: string,
      value: T) {
    if (test !== '<') {
      throw new Error('Mock does not support this query test. ' + test);
    }

    this.collection = collection;
    this.key = key;
    this.test = test;
    this.value = value;
  }

  async get(): Promise<Array<FakeDocSnapshot<T|null>>> {
    const snapshot = await this.collection.get();
    const docs = snapshot.docs;
    return docs.filter((doc) => {
      const data = doc.data();
      if (!data) {
        return false;
      }
      if (this.test === '<') {
        // tslint:disable-next-line no-any
        return (data as any)[this.key] < this.value;
      }
      throw new Error('Unsupported query test.');
    });
  }
}

class FakeDocSnapshot<T> {
  private innerData: T;
  private parent: FakeDoc<T>;

  constructor(doc: FakeDoc<T>, data: T) {
    this.innerData = data;
    this.parent = doc;
  }

  get exists() {
    if (!this.innerData) {
      return false;
    }
    return true;
  }

  data() {
    return this.innerData;
  }

  get ref() {
    return this.parent;
  }
}

class FakeCollectionSnapshot<T> {
  private innerDocs: Array<FakeDocSnapshot<T>>;

  constructor(docs: Array<FakeDocSnapshot<T>>) {
    this.innerDocs = docs;
  }

  get docs() {
    return this.innerDocs;
  }
}


class FakeDoc<T> {
  private data: T|null;
  private parent: FakeCollection<T>;
  private name: string;
  private collections: {[key: string]: FakeCollection<T>};

  constructor(parent: FakeCollection<T>, name: string) {
    this.data = null;
    this.parent = parent;
    this.name = name;
    this.collections = {};
  }

  collection(name: string) {
    if (this.collections[name]) {
      return this.collections[name];
    }

    this.collections[name] = new FakeCollection();
    return this.collections[name];
  }

  async get(): Promise<FakeDocSnapshot<T|null>> {
    return new FakeDocSnapshot(this, this.data);
  }

  async create(data: T) {
    if (this.data) {
      throw new Error('Doc already exists.');
    }
    this.data = data;
  }

  async update(data: T) {
    if (!this.data) {
      throw new Error('You can only update an existing doc');
    }
    this.data = Object.assign(this.data, data);
  }

  async set(data: T) {
    this.data = data;
  }

  async delete() {
    return this.parent._deleteDoc(this.name);
  }
}

class FakeCollection<T> {
  private docs: {[key: string]: FakeDoc<T>};

  constructor() {
    this.docs = {};
  }

  doc(name: string) {
    if (this.docs[name]) {
      return this.docs[name];
    }

    this.docs[name] = new FakeDoc(this, name);
    return this.docs[name];
  }

  where(key: string, test: '<', value: T): FakeQuery<T> {
    return new FakeQuery(this, key, test, value);
  }

  async get(): Promise<FakeCollectionSnapshot<T|null>> {
    const docs = await Promise.all(
        Object.keys(this.docs).map((name) => this.docs[name].get()));
    return new FakeCollectionSnapshot(docs);
  }

  async _deleteDoc(name: string) {
    if (this.docs[name]) {
      delete this.docs[name];
    }
  }
}

export function getFirestoreMock<T>(): Firestore {
  const mockFirstoreData: {[key: string]: FakeCollection<T>} = {};

  // tslint:disable-next-line no-any
  const firestoreMock: any = {
    runTransaction: (cb: Function) => {
      return cb({
        get: (docRef: FakeDoc<T>) => {
          return docRef.get();
        },
        set: (docRef: FakeDoc<T>, data: T) => {
          docRef.set(data);
          return cb;
        },
        delete: (docRef: FakeDoc<T>) => {
          docRef.delete();
          return cb;
        },
      });
    },
    batch: () => {
      return new FakeBatch();
    },
    collection: (collectionName: string) => {
      if (mockFirstoreData[collectionName]) {
        return mockFirstoreData[collectionName];
      }

      mockFirstoreData[collectionName] = new FakeCollection();
      return mockFirstoreData[collectionName];
    },
  };
  firestoreMock._data = mockFirstoreData;

  return firestoreMock;
}
