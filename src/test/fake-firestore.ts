/* tslint:disable:no-any */

class FakeSnapshot {
  private innerData: any;

  constructor(data: any) {
    this.innerData = data;
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
}

class FakeDoc {
  private data: any;
  private parent: FakeCollection;
  private name: string;

  constructor(parent: FakeCollection, name: string) {
    this.data = null;
    this.parent = parent;
    this.name = name;
  }

  async get() {
    return new FakeSnapshot(this.data);
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

  async _deleteDoc(name: string) {
    if (this.docs[name]) {
      delete this.docs[name];
    }
  }
}



export function getFirestoreMock() {
  const mockFirstoreData: any = {};

  const firestoreMock: any = {
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
