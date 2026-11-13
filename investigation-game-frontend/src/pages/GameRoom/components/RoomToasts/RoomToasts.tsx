import { getGameplayIconTone, notificationIcons } from '@/components/notificationIcons';
import type { ToastNotification } from '@/context/RoomContext.shared';
import PopupNotice from '@/components/PopupNotice';
import NotificationStack from '@/components/NotificationStack';

const noop = () => {};
export default function RoomToasts({ toasts, onDismiss, onPauseChange = noop }: {
  toasts: (ToastNotification & { visible?: boolean })[];
  onDismiss?: (id: string) => void;
  onPauseChange?: (paused: boolean) => void;
}) {
  return <NotificationStack onPauseChange={onPauseChange} entries={toasts.map(item => ({
    id: item.id, visible: item.visible !== false,
    content: <div role="status" aria-live="polite"><PopupNotice icon={notificationIcons[item.icon]} iconTone={getGameplayIconTone(item.icon)} onDismiss={onDismiss ? () => onDismiss(item.id) : undefined}>
      <strong>{item.title}</strong><p>{item.message}</p>
    </PopupNotice></div>,
  }))} />;
}
