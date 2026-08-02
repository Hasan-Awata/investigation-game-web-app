import { useState, useCallback, useEffect } from 'react';

// Define the allowed entities so TypeScript strictly guards your scaling
type TrackableEntity = 'evidence' | 'suspects' | 'locations';

export function useViewedItems(roomId: number | undefined, entityType: TrackableEntity) {
  // Dynamically generate the storage key namespace
  const storageKey = roomId ? `room_${roomId}_viewed_${entityType}` : null;

  const [viewedItems, setViewedItems] = useState<Set<number>>(() => {
    if (!storageKey) return new Set();
    const stored = sessionStorage.getItem(storageKey);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  useEffect(() => {
    if (!storageKey) return;
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      setViewedItems(new Set(JSON.parse(stored)));
    }
  }, [storageKey]);

  const markItemAsViewed = useCallback((id: number) => {
    if (!storageKey) return;

    setViewedItems(prev => {
      if (prev.has(id)) return prev; 
      
      const nextViewed = new Set(prev);
      nextViewed.add(id);
      
      sessionStorage.setItem(storageKey, JSON.stringify(Array.from(nextViewed)));
      
      return nextViewed;
    });
  }, [storageKey]);

  return { viewedItems, markItemAsViewed };
}