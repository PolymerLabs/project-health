const DB_NAME = 'project-health-analytics';
const DB_VERSION = 1;
const CLIENT_ID_STORENAME = 'client-id-store';
const CLIENT_ID_KEY = 'clientID';

export class ClientIDModel {
  private db: IDBDatabase|null;

  constructor() {
    this.db = null;
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
             const request = indexedDB.open(DB_NAME, DB_VERSION);
             request.onerror = () => {
               reject(request.error);
             };
             request.onupgradeneeded = this.updateDB;
             request.onsuccess = (event) => {
               // tslint:disable-next-line:no-any
               this.db = (event.target as any).result as IDBDatabase;
               resolve(this.db);
             };
           }) as Promise<IDBDatabase>;
  }

  // tslint:disable-next-line:no-any
  private async updateDB(event: any) {
    const db = event.target.result;
    if (event.oldVersion < 2) {
      db.createObjectStore(CLIENT_ID_STORENAME);
    }
  }

  async saveId(clientId: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
             const transaction =
                 db.transaction(CLIENT_ID_STORENAME, 'readwrite');
             transaction.oncomplete = () => {
               resolve();
             };

             transaction.onerror = () => {
               reject(transaction.error);
             };

             const objectStore = transaction.objectStore(CLIENT_ID_STORENAME);
             objectStore.put(clientId, CLIENT_ID_KEY);
           }) as Promise<void>;
  }

  async getId(): Promise<string> {
    const db = await this.getDB();
    const transaction = db.transaction(CLIENT_ID_STORENAME);
    const objectStore = transaction.objectStore(CLIENT_ID_STORENAME);
    let clientId = await (new Promise((resolve, reject) => {
                            const request = objectStore.get(CLIENT_ID_KEY);
                            request.onerror = () => {
                              reject(request.error);
                            };
                            request.onsuccess = () => {
                              resolve(request.result);
                            };
                          }) as Promise<string>);
    if (!clientId) {
      clientId = 'unknown-client-id';
    }
    return clientId;
  }
}
