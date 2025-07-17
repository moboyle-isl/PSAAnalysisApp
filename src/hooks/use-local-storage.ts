import { useState, useEffect, useCallback } from 'react';

// This function now returns the initialValue on the server and during the first client render.
// The actual value from localStorage is retrieved in the useEffect hook.
function getInitialValue<T>(key: string, initialValue: T): T {
  if (typeof window === 'undefined') {
    return initialValue;
  }
  // To prevent hydration mismatch, we return the initialValue on the first client render.
  // The useEffect will then sync it with localStorage.
  return initialValue; 
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => getInitialValue(key, initialValue));

  useEffect(() => {
    // This effect runs only once on the client after hydration.
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      } else {
        // If nothing is in localStorage, we set it with the initialValue
        window.localStorage.setItem(key, JSON.stringify(initialValue));
        setStoredValue(initialValue);
      }
    } catch (error) {
      console.error(error);
      setStoredValue(initialValue);
    }
    
    // An event listener to sync state across tabs.
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
  }, [key, initialValue]); // The dependency array should only contain `key` and `initialValue` to run once per key.

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}
