import PopupAction from '@/components/PopupAction';
import type { GlobalFeedback } from '@/context/RoomContext.shared';
import PopupDialog from '@/components/PopupDialog';

interface RoomFeedbackDialogProps extends GlobalFeedback {
  acknowledgeLabel: string;
  onAcknowledge: () => void;
}

export default function RoomFeedbackDialog({ type, title, message, acknowledgeLabel, onAcknowledge }: RoomFeedbackDialogProps) {
  return <PopupDialog title={title} tone={type} actions={<PopupAction onClick={onAcknowledge}>{acknowledgeLabel}</PopupAction>}>
    <p>{message}</p>
  </PopupDialog>;
}
