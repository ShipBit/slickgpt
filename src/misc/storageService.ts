import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface StorageService {
    getItem<T>(key: string): Promise<T | null>;
    setItem<T>(key: string, value: T): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
}

interface MyDB extends DBSchema {
    'chatStore': {
        key: string;
        value: any;
    };
}

class IdbStorageService implements StorageService {
    private dbName = 'slickGPT';
    private storeName: 'chatStore' = 'chatStore';
    private db: IDBPDatabase<MyDB> | null = null;

    constructor() {
        this.initDb();
    }

    private async initDb(): Promise<void> {
        try {
            this.db = await openDB<MyDB>(this.dbName, 1, {
                upgrade(db) {
                    db.createObjectStore('chatStore');
                },
            });
        } catch (error) {
            console.error('Failed to initialize IndexedDB:', error);
        }
    }

    private async getDb(): Promise<IDBPDatabase<MyDB> | null> {
        if (!this.db) {
            await this.initDb();
        }
        return this.db;
    }

    async getItem<T>(key: string): Promise<T | null> {
        try {
            const db = await this.getDb();
            if (!db) return null;
            return await db.get(this.storeName, key);
        } catch (error) {
            return null;
        }
    }

    async setItem<T>(key: string, value: T): Promise<void> {
        try {
            const db = await this.getDb();
            if (!db) return;
            await db.put(this.storeName, value, key);
        } catch (error) {
            console.error('Error in setItem:', error);
        }
    }

    async removeItem(key: string): Promise<void> {
        try {
            const db = await this.getDb();
            if (!db) return;
            await db.delete(this.storeName, key);
        } catch (error) {
            console.error('Error in removeItem:', error);
        }
    }

    async clear(): Promise<void> {
        try {
            const db = await this.getDb();
            if (!db) return;
            await db.clear(this.storeName);
        } catch (error) {
            console.error('Error in clear:', error);
        }
    }
}

class InMemoryStorageService implements StorageService {
    private storage: Map<string, any> = new Map();

    async getItem<T>(key: string): Promise<T | null> {
        return this.storage.get(key) || null;
    }

    async setItem<T>(key: string, value: T): Promise<void> {
        this.storage.set(key, value);
    }

    async removeItem(key: string): Promise<void> {
        this.storage.delete(key);
    }

    async clear(): Promise<void> {
        this.storage.clear();
    }
}

const createStorageService = (): StorageService => {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
        return new IdbStorageService();
    }
    return new InMemoryStorageService();
};

const storageService: StorageService = createStorageService();

export default storageService;