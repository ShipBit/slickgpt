import { writable, type Writable } from 'svelte/store';
import storageServicePromise from './storageService';

export async function persistentStore<T>(key: string, initialValue: T): Promise<Writable<T>> {
	const store = writable<T>(initialValue);

	try {
		const storageService = await storageServicePromise;
		const storedValue = await storageService.getItem<T>(key);
		if (storedValue !== null && storedValue !== undefined) {
			store.set(storedValue);
		} else {
			await storageService.setItem(key, initialValue);
		}
	} catch (error) {
		console.error(`Error in persistentStore:`, error);
	}

	return {
		subscribe: store.subscribe,
		set: async (value: T) => {
			store.set(value);
			try {
				const storageService = await storageServicePromise;
				await storageService.setItem(key, value);
			} catch (error) {
				console.error(`Error setting value for ${key}:`, error);
			}
		},
		update: async (updater: (value: T) => T) => {
			store.update((currentValue) => {
				const newValue = updater(currentValue);
				// unawaitable as syncronous updater.
				storageServicePromise.then((storageService) => storageService.setItem(key, newValue));
				return newValue;
			});
		}
	};
}
