import { useState, useCallback, useEffect } from 'react';
import { getSafeStorage, setSafeStorage } from '@/utils/storage';

type TrackableEntity = 'evidence' | 'characters' | 'locations';

const readViewed = (storageKey: string): Set<number> => {
  return new Set(getSafeStorage<number[]>('session', storageKey, []));
};

export function useViewedItems(roomKey: string | number | undefined, entityType: TrackableEntity) {
  const storageKey = roomKey ? `room_${roomKey}_viewed_${entityType}` : null;

  const [viewedItems, setViewedItems] = useState<Set<number>>(() => {
    if (!storageKey) return new Set();
    return readViewed(storageKey);
  });

  useEffect(() => {
    if (!storageKey) return;
    setViewedItems(readViewed(storageKey));
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
