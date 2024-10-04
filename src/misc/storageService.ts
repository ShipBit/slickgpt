import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface StorageService {
	getItem<T>(key: string): Promise<T | null>;
	setItem<T>(key: string, value: T): Promise<void>;
	removeItem(key: string): Promise<boolean>;
	clear(): Promise<void>;
}

interface MyDB extends DBSchema {
	chatStore: {
		key: string;
		value: any;
	};
}

class IdbStorageService implements StorageService {
	private dbName = 'slickGPT';
	private storeName: 'chatStore' = 'chatStore';
	private db: IDBPDatabase<MyDB> | null = null;

	public async initDb(): Promise<void> {
		try {
			this.db = await openDB<MyDB>(this.dbName, 1, {
				upgrade(db) {
					db.createObjectStore('chatStore');
				}
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
			return db.get(this.storeName, key);
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

	async removeItem(key: string): Promise<boolean> {
		try {
			const db = await this.getDb();
			if (!db) return false;
			await db.delete(this.storeName, key);
			return true;
		} catch (error) {
			console.error('Error in removeItem:', error);
			return false;
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

	async migrateLocalStorageToIndexedDB() {
		const keys = Object.keys(localStorage);
		for (const key of keys) {
			const value = localStorage.getItem(key);
			if (value) {
				try {
					const parsedValue = JSON.parse(value);
					await this.setItem(key, parsedValue);
					localStorage.removeItem(key);
				} catch (e) {
					console.error(`Failed to migrate key "${key}"`, e);
				}
			}
		}
	}
}

class InMemoryStorageService implements StorageService {
	private storage: Map<string, any> = new Map();

	getItem<T>(key: string): Promise<T | null> {
		return this.storage.get(key) || null;
	}

	async setItem<T>(key: string, value: T): Promise<void> {
		this.storage.set(key, value);
	}

	async removeItem(key: string): Promise<boolean> {
		return this.storage.delete(key);
	}

	async clear(): Promise<void> {
		this.storage.clear();
	}
}

const createStorageService = async (): Promise<StorageService> => {
	if (typeof window !== 'undefined' && 'indexedDB' in window) {
		const idbService = new IdbStorageService();

		// migrate old chat to indexedDb
		await idbService.migrateLocalStorageToIndexedDB();
		await idbService.initDb();

		return idbService;
	}
	return new InMemoryStorageService();
};

const storageService: Promise<StorageService> = createStorageService();

export default storageService;
