interface StorageService {
    getItem<T>(key: string): Promise<T | null>;
    setItem<T>(key: string, value: T): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
}

class IndexedDbService implements StorageService {
    private dbName = 'slickGPT';
    private storeName = 'chatStore';

    private checkIndexedDb(): void {
        if (typeof indexedDB === 'undefined') {
            throw new Error('IndexedDB is not available in the current environment.');
        }
    }

    private async getDb() {
        this.checkIndexedDb();

        return new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = (event.target as any).result as IDBDatabase;
                db.createObjectStore(this.storeName);
            };
            request.onsuccess = (event: Event) => {
                resolve((event.target as any).result as IDBDatabase);
            };
            request.onerror = (event: Event) => {
                reject((event.target as any).error);
            };
        });
    }

    private async withStore<R>(
        type: IDBTransactionMode,
        callback: (store: IDBObjectStore, resolve: (value: R | PromiseLike<R>) => void, reject: (reason?: unknown) => void) => void
    ): Promise<R> {
        const db = await this.getDb();
        const transaction = db.transaction(this.storeName, type);
        const store = transaction.objectStore(this.storeName);
        return new Promise<R>((resolve, reject) => {
            callback(store, resolve, reject);
            transaction.oncomplete = () => resolve(undefined as unknown as R);
            transaction.onerror = (event: Event) => reject((event.target as any).error);
        });
    }

    async getItem<T>(key: string): Promise<T | null> {
        return this.withStore<T | null>('readonly', (store, resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = (event) => {
                resolve((event.target as any).result || null);
            };
            request.onerror = (event: Event) => {
                reject((event.target as any).error);
            };
        });
    }

    async setItem<T>(key: string, value: T): Promise<void> {
        return this.withStore<void>('readwrite', (store, resolve, reject) => {
            const request = store.put(value, key);
            request.onsuccess = () => {
                resolve();
            };
            request.onerror = (event: Event) => {
                reject((event.target as any).error);
            };
        });
    }

    async removeItem(key: string): Promise<void> {
        return this.withStore<void>('readwrite', (store, resolve, reject) => {
            const request = store.delete(key);
            request.onsuccess = () => {
                resolve();
            };
            request.onerror = (event: Event) => {
                reject((event.target as any).error);
            };
        });
    }

    async clear(): Promise<void> {
        return this.withStore<void>('readwrite', (store, resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => {
                resolve();
            };
            request.onerror = (event: Event) => {
                reject((event.target as any).error);
            };
        });
    }
}

// No operation storage service for environments where no storage is available
class NoopStorageService implements StorageService {
    async getItem<T>(key: string): Promise<T | null> {
        return null;
    }

    async setItem<T>(key: string, value: T): Promise<void> {
        // Noop
    }

    async removeItem(key: string): Promise<void> {
        // Noop
    }

    async clear(): Promise<void> {
        // Noop
    }
}

// Determine which service to use based on environment capability
const useIndexedDb = typeof indexedDB !== 'undefined';

const storageService: StorageService = useIndexedDb ? new IndexedDbService() : new NoopStorageService();

export default storageService;
