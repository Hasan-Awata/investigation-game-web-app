import { useTranslation } from 'react-i18next';

interface RoomExitDialogProps {
  isLeaving: boolean;
  onCancel: () => void;
  onLeave: () => void;
}

export default function RoomExitDialog({ isLeaving, onCancel, onLeave }: RoomExitDialogProps) {
  const { t } = useTranslation();

  return (
    <div className="feedback-modal-overlay" style={{ zIndex: 9999 }}>
      <div className="feedback-modal-content error">
        <h3 className="feedback-title">{t('pages.gameRoom.layout.exitWarningTitle', 'Abandon Investigation?')}</h3>
        <p className="feedback-message">{t('pages.gameRoom.layout.exitWarningDesc')}</p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="btn-secondary" onClick={onCancel}>{t('pages.gameRoom.layout.stay', 'Maintain Connection')}</button>
          <button className="btn-primary" style={{ background: 'var(--accent-crimson)', borderColor: 'var(--accent-crimson)', color: 'var(--bg-dark)' }} onClick={onLeave} disabled={isLeaving}>
            {isLeaving ? t('pages.gameRoom.layout.leaving', 'Severing...') : t('pages.gameRoom.layout.leave', 'Sever Connection')}
          </button>
        </div>
      </div>
    </div>
  );
}
