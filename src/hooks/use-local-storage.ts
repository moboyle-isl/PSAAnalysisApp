import { useState, useEffect, useCallback } from 'react';

// A debounced function to dispatch storage events.
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const debounced = (...args: Parameters<F>) => {
        if (timeout !== null) {
            clearTimeout(timeout);
            timeout = null;
        }
        timeout = setTimeout(() => func(...args), waitFor);
    };

    return debounced;
};
const debouncedDispatch = debounce((key: string, newValue: string) => {
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
}, 500);

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

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        const serializedValue = JSON.stringify(valueToStore);
        window.localStorage.setItem(key, serializedValue);
        // Dispatch a storage event to sync across tabs
        debouncedDispatch(key, serializedValue);
      }
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  // Effect to listen for changes from other tabs or direct manipulations
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        try {
          setStoredValue(JSON.parse(event.newValue));
        } catch (error) {
          console.error(error);
        }
      } else if (event.key === key && event.newValue === null) {
        // Handle item removal
         try {
          setStoredValue(initialValue);
         } catch(e) {
            console.error(e);
         }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}
