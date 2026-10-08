import { useState, useCallback, useEffect, useRef } from 'react';
import { getSafeStorage, setSafeStorage } from '@/utils/storage';

type TrackableEntity = 'evidence' | 'characters';

const readViewed = (storageKey: string): Set<number> => {
  return new Set(getSafeStorage<number[]>('session', storageKey, []));
};

export function useViewedItems(roomKey: string | number | undefined, entityType: TrackableEntity) {
  const storageKey = roomKey ? `room_${roomKey}_viewed_${entityType}` : null;

  const [viewedItems, setViewedItems] = useState<Set<number>>(() => {
    if (!storageKey) return new Set();
    return readViewed(storageKey);
  });

  const prevStorageKeyRef = useRef(storageKey);

  useEffect(() => {
    if (!storageKey) return;
    // Sync with storage when storageKey changes (e.g., room switch)
    if (prevStorageKeyRef.current !== storageKey) {
      prevStorageKeyRef.current = storageKey;
      const next = readViewed(storageKey);
      setViewedItems(prev => {
        if (prev.size === next.size && [...prev].every(v => next.has(v))) return prev;
        return next;
      });
    }
  }, [storageKey]);

  const markItemAsViewed = useCallback((id: number) => {
    if (!storageKey) return;

    setViewedItems(prev => {
      if (prev.has(id)) return prev;

      const nextViewed = new Set(prev);
      nextViewed.add(id);

      setSafeStorage('session', storageKey, Array.from(nextViewed));

      return nextViewed;
    });
  }, [storageKey]);

  return { viewedItems, markItemAsViewed };
}
