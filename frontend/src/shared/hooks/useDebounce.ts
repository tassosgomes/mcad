import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of value that only updates after
 * the specified delay (default 300ms) has elapsed since the last change.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
