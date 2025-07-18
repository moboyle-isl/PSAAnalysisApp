
import { useState, useEffect, useCallback } from 'react';

// This custom hook is now simpler because its only job is to sync a single value
// with localStorage and across tabs. It doesn't need to know about projects.

function getInitialValue<T>(key: string, initialValue: T): T {
  // For server-side rendering, return the initialValue.
  if (typeof window === 'undefined') {
    return initialValue;
  }
  // On the client, try to get the value from localStorage.
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error);
    return initialValue;
  }
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => getInitialValue(key, initialValue));

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        // Dispatch event so other tabs can sync
        window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(valueToStore) }));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Effect to listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue));
        } catch (error) {
          console.error(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // An effect to sync the value on mount, in case it was changed in another tab
    // while this component was unmounted.
    const currentValue = window.localStorage.getItem(key);
    if (currentValue !== null) {
      setStoredValue(JSON.parse(currentValue));
    }


    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue];
}
