import { useCallback, useEffect, useRef } from 'react';

/**
 * Leak-free `setTimeout`.
 *
 * Every pending timer id is tracked in a ref and cleared unconditionally on
 * unmount, so a component can schedule delayed feedback without ever calling
 * `setState` from a timer that outlived it. The handler is dropped if it
 * would run after unmount.
 */
export function useSafeTimeout() {
  const timeoutIds = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const pending = timeoutIds.current;
    return () => {
      isMounted.current = false;
      pending.forEach((id) => clearTimeout(id));
      pending.clear();
    };
  }, []);

  const safeTimeout = useCallback((handler: () => void, ms: number): void => {
    const id = setTimeout(() => {
      timeoutIds.current.delete(id);
      if (isMounted.current) handler();
    }, ms);
    timeoutIds.current.add(id);
  }, []);

  return safeTimeout;
}
