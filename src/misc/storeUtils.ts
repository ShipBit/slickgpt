import { writable, type Writable } from 'svelte/store';
import storageService from './storageService';

export async function persistentStore<T>(key: string, initialValue: T): Promise<Writable<T>> {
  const store = writable<T>(initialValue);
  let loadedFromStorage = false;

  try {
    const storedValue = await storageService.getItem<T>(key);
    if (storedValue !== null && storedValue !== undefined) {
      store.set(storedValue);
    } else {
      await storageService.setItem(key, initialValue);
    }
  } catch (error) {
    // handle err
  }

  loadedFromStorage = true;

  return {
    subscribe: store.subscribe,
    set: async (value: T) => {
      store.set(value);
      if (loadedFromStorage) {
        try {
          await storageService.setItem(key, value);
        } catch (error) {
          // handle err
        }
      }
    },
    update: async (updater: (value: T) => T) => {
      store.update(currentValue => {
        const newValue = updater(currentValue);
        if (loadedFromStorage) {
          storageService.setItem(key, newValue).catch(error => {
            // handle err
          });
        }
        return newValue;
      });
    }
  };
}
