import { createPortal } from 'react-dom';
import type { ToastNotification } from '@/context/RoomContext.shared';

export default function RoomToasts({ toasts }: { toasts: ToastNotification[] }) {
  return createPortal(
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className="system-toast-notification">
          <div className="toast-icon pulse-icon"><img src={toast.icon} alt={toast.type} className="toast-svg-graphic" /></div>
          <div className="toast-text-block">
            <span className="toast-header">{toast.title}</span>
            <p className="toast-message">{toast.message}</p>
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
}
