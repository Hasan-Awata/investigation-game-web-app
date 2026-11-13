import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastNotification } from '@/context/RoomContext.shared';
import { notificationTiming } from '@/components/notificationTiming';

export type RoomNotification = ToastNotification & { visible: boolean; remaining: number };
export function useRoomNotifications() {
  const [toasts, setToasts] = useState<RoomNotification[]>([]);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const updatedAt = useRef(0);
  const advance = useCallback(() => {
    const now = Date.now();
    const elapsed = now - updatedAt.current;
    updatedAt.current = now;
    const isPaused = pausedRef.current;
    setToasts(previous => previous.flatMap(item => {
      const remaining = item.remaining - (item.visible && isPaused ? 0 : elapsed);
      if (remaining > 0) return [{ ...item, remaining }];
      return item.visible ? [{ ...item, visible: false, remaining: notificationTiming.exit }] : [];
    }));
  }, []);
  const onPauseChange = useCallback((value: boolean) => {
    if (pausedRef.current === value) return;
    advance();
    pausedRef.current = value;
    setPaused(value);
  }, [advance]);
  const addGlobalToast = useCallback((data: Omit<ToastNotification, 'id'>) => {
    advance();
    setToasts(previous => [...previous, { ...data, id: crypto.randomUUID(), visible: true, remaining: notificationTiming.duration }]);
  }, [advance]);
  const dismiss = useCallback((id: string) => {
    advance();
    setToasts(previous => previous.map(item => item.id === id && item.visible ? { ...item, visible: false, remaining: notificationTiming.exit } : item));
  }, [advance]);
  useEffect(() => {
    const delays = toasts.filter(item => !item.visible || !paused).map(item => item.remaining);
    if (!delays.length) return;
    const timer = window.setTimeout(advance, Math.min(...delays));
    return () => window.clearTimeout(timer);
  }, [toasts, paused, advance]);
  return { toasts, addGlobalToast, dismiss, onPauseChange };
}
