import { useState, useCallback, useEffect } from 'react';

// Define the allowed entities so TypeScript strictly guards your scaling
type TrackableEntity = 'evidence' | 'suspects' | 'locations' | 'victims';

export function useViewedItems(roomKey: string | number | undefined, entityType: TrackableEntity) {
  // Use the roomKey in the namespace
  const storageKey = roomKey ? `room_${roomKey}_viewed_${entityType}` : null;

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