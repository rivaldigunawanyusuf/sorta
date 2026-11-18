import { useEffect, useState } from 'react';

export function usePersistentState<T>(
  storageKey: string,
  initialValue: T | (() => T),
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const resolveInitial = () =>
    typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;

  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return resolveInitial();
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === null) return resolveInitial();
      return JSON.parse(saved) as T;
    } catch {
      return resolveInitial();
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Ignore quota exceeded errors in private browsing mode
    }
  }, [storageKey, value]);

  return [value, setValue];
}
