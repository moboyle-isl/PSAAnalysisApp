import { useState, useEffect, useCallback } from 'react';

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
    console.error(error);
    return initialValue;
  }
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Pass a function to useState so it only runs once on the client.
  const [storedValue, setStoredValue] = useState<T>(() => getInitialValue(key, initialValue));

  // This effect will run on the client after hydration to sync with localStorage if it was empty.
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) {
        // If nothing is in localStorage, set it with the initialValue.
        window.localStorage.setItem(key, JSON.stringify(initialValue));
        setStoredValue(initialValue);
      }
    } catch (error) {
      console.error("Could not sync with localStorage", error);
    }
  }, [key, initialValue]);


  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
         // Dispatch a storage event to sync across tabs
        window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(valueToStore) }));
      }
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  // Effect to listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        try {
          setStoredValue(JSON.parse(event.newValue));
        } catch (error) {
          console.error(error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue];
}
