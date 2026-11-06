import type { GlobalFeedback } from '@/context/RoomContext.shared';

interface RoomFeedbackDialogProps extends GlobalFeedback {
  acknowledgeLabel: string;
  onAcknowledge: () => void;
}

export default function RoomFeedbackDialog({ type, title, message, acknowledgeLabel, onAcknowledge }: RoomFeedbackDialogProps) {
  return (
    <div className="feedback-modal-overlay" style={{ zIndex: 9999 }}>
      <div className={`feedback-modal-content ${type}`}>
        <h3 className="feedback-title">{title}</h3>
        <p className="feedback-message">{message}</p>
        <button className="btn-secondary mt-1" onClick={onAcknowledge}>
          {acknowledgeLabel}
        </button>
      </div>
    </div>
  );
}
