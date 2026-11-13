import { notificationIcons } from '@/components/notificationIcons';
import { createPortal } from 'react-dom';
import type { ToastNotification } from '@/context/RoomContext.shared';
import PopupNotice from '@/components/PopupNotice';
import styles from '@/components/PopupNotice.module.css';

export default function RoomToasts({ toasts }: { toasts: ToastNotification[] }) {
  return createPortal(
    <div className={styles.stack} aria-live="polite" aria-relevant="additions">
      {toasts.map(toast => (
        <PopupNotice key={toast.id} icon={notificationIcons[toast.icon]}>
          <strong>{toast.title}</strong>
          <p>{toast.message}</p>
        </PopupNotice>
      ))}
    </div>,
    document.body,
  );
}
