/* tslint:disable:no-any */

class FakeBatch {
  private docsToDelete: FakeDoc[];

  constructor() {
    this.docsToDelete = [];
  }

  delete(doc: FakeDoc) {
    this.docsToDelete.push(doc);
  }

  async commit() {
    for (const doc of this.docsToDelete) {
      await doc.delete();
    }
  }
}

class FakeQuery {
  private collection: FakeCollection;
  private key: string;
  private test: string;
  private value: any;

  constructor(
      collection: FakeCollection,
      key: string,
      test: string,
      value: any) {
    if (test !== '<') {
      throw new Error('Mock does not support this query test. ' + test);
    }

    this.collection = collection;
    this.key = key;
    this.test = test;
    this.value = value;
  }

  async get() {
    const snapshot = await this.collection.get();
    const docs = snapshot.docs;
    return docs.filter((doc) => {
      if (this.test === '<') {
        return doc.data()[this.key] < this.value;
      }
      throw new Error('Unsupported query test.');
    });
  }
}

class FakeDocSnapshot {
  private innerData: any;
  private parent: FakeDoc;

  constructor(doc: FakeDoc, data: any) {
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

class FakeCollectionSnapshot {
  private innerDocs: FakeDocSnapshot[];

  constructor(docs: FakeDocSnapshot[]) {
    this.innerDocs = docs;
  }

  get docs() {
    return this.innerDocs;
  }
}


class FakeDoc {
  private data: any;
  private parent: FakeCollection;
  private name: string;
  private collections: any;

  constructor(parent: FakeCollection, name: string) {
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

  async get() {
    return new FakeDocSnapshot(this, this.data);
  }

  async update(data: any) {
    this.data = Object.assign(this.data, data);
  }

  async set(data: any) {
    this.data = data;
  }

  async delete() {
    return this.parent._deleteDoc(this.name);
  }
}

class FakeCollection {
  private docs: any;

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

  where(key: string, test: '<', value: any) {
    return new FakeQuery(this, key, test, value);
  }

  async get() {
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

export function getFirestoreMock() {
  const mockFirstoreData: any = {};

  const firestoreMock: any = {
    runTransaction: (cb: Function) => {
      return cb({
        get: (docRef: FakeDoc) => {
          return docRef.get();
        },
        set: (docRef: FakeDoc, data: any) => {
          return docRef.set(data);
        }
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
