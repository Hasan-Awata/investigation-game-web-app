import { useTranslation } from 'react-i18next';
import type { Victim } from '@/types';
import './VictimModal.css';

interface VictimModalProps {
  victim: Victim | null;
  onClose: () => void;
}

export default function VictimModal({ victim, onClose }: VictimModalProps) {
  const { t } = useTranslation();

  if (!victim) return null;

  return (
    <div className="modal-backdrop victim-modal-backdrop" onClick={onClose}>
      <div
        className="modal-content glass-panel victim-modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={onClose}>✕</button>

        <div className="victim-modal-layout">
          {/* Left/Right Column: Image */}
          <div
            className="victim-modal-image"
            style={{
              backgroundImage: `url(${victim.img_url || '/placeholder-mugshot.jpg'})`,
            }}
          />

          {/* Details Column */}
          <div className="victim-modal-details">
            <h2 className="victim-modal-name">
              {victim.name}
            </h2>

            <div className="victim-modal-background-text">
              {victim.background || t('pages.gameRoom.caseDetails.noBackground')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}