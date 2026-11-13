import { useCallback } from 'react';
import toast, { resolveValue, useToaster } from 'react-hot-toast';
import { notificationIcons } from '@/components/notificationIcons';
import { notificationTiming } from '@/components/notificationTiming';
import PopupNotice from '@/components/PopupNotice';
import NotificationStack from '@/components/NotificationStack';

export default function AdminToasts() {
  const { toasts, handlers: { startPause, endPause } } = useToaster({
    duration: notificationTiming.duration, removeDelay: notificationTiming.exit, loading: { duration: Infinity },
  });
  const onPauseChange = useCallback((paused: boolean) => { if (paused) startPause(); else endPause(); }, [startPause, endPause]);
  return <NotificationStack onPauseChange={onPauseChange} entries={[...toasts].reverse().map(item => ({
    id: item.id, visible: item.visible,
    content: <div {...item.ariaProps}><PopupNotice
      icon={item.icon ?? notificationIcons[item.type === 'blank' || item.type === 'custom' ? 'information' : item.type]}
      tone={item.type === 'success' || item.type === 'error' ? item.type : undefined}
      onDismiss={() => toast.dismiss(item.id)}>{resolveValue(item.message, item)}</PopupNotice></div>,
  }))} />;
}
