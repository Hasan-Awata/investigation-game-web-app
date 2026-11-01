import { useEffect } from 'react';
import { leaveRoomBeacon } from '@/services/api';

export function useRoomPageHide(roomId: number) {
  useEffect(() => {
    const onPageHide = (event: PageTransitionEvent) => {
      if (!event.persisted) void leaveRoomBeacon(roomId);
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [roomId]);
}
