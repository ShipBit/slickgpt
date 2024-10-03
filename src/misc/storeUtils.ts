import { writable, type Writable } from 'svelte/store';
import storageService from './storageService';

export function persistentStore<T>(key: string, initialValue: T): Writable<T> {
  const store = writable<T>(initialValue);
  let loadedFromStorage = false;

  // Load stored value from IndexedDB
  storageService.getItem<T>(key).then((storedValue) => {
    if (storedValue !== null) {
      console.log(`persistentStore initial load: ${key} ->`, storedValue);  // Debugging log
      store.set(storedValue);
    }
    loadedFromStorage = true;  // Mark as loaded from storage
  }).catch(error => {
    console.error(`Error loading initial value for ${key}:`, error);  // Debugging log
    loadedFromStorage = true;  // Ensure store updates proceed despite error
  });

  function subscribe(run: (value: T) => void, invalidate?: (value?: T) => void) {
    return store.subscribe((value) => {
      run(value);
      if (!loadedFromStorage) return;  // Skip during initial load until fully loaded
      storageService.setItem(key, value).then(() => {
        console.log(`persistentStore subscription update: ${key} ->`, value);  // Debugging log
      }).catch(error => {
        console.error(`Error setting value for ${key}:`, error);  // Debugging log
      });
    }, invalidate);
  }

  const set = (value: T) => {
    store.set(value);
    if (loadedFromStorage) {
      storageService.setItem(key, value).then(() => {
        console.log(`persistentStore set update: ${key} ->`, value);  // Debugging log
      }).catch(error => {
        console.error(`Error setting value for ${key} using set:`, error);  // Debugging log
      });
    }
  };

  const update = (updater: (value: T) => T) => {
    store.update((currentValue) => {
      const updatedValue = updater(currentValue);
      if (loadedFromStorage) {
        storageService.setItem(key, updatedValue).then(() => {
          console.log(`persistentStore update: ${key} ->`, updatedValue);  // Debugging log
        }).catch(error => {
          console.error(`Error setting value for ${key} using update:`, error);  // Debugging log
        });
      }
      return updatedValue;
    });
  };

  return { subscribe, set, update };
}
