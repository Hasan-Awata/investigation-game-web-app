import { useTranslation } from 'react-i18next';
import type { Victim } from '@/types';

interface VictimModalProps {
  victim: Victim | null;
  onClose: () => void;
}

export default function VictimModal({ victim, onClose }: VictimModalProps) {
  const { t } = useTranslation();

  if (!victim) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 2000 }}>
      <div
        className="modal-content glass-panel"
        style={{ maxWidth: '650px', padding: '2.5rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={onClose}>✕</button>

        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
          {/* Left/Right Column: Image */}
          <div
            style={{
              width: '180px',
              height: '180px',
              backgroundImage: `url(${victim.img_url || '/placeholder-mugshot.jpg'})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              flexShrink: 0,
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
            }}
          />

          {/* Details Column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{
              margin: '0 0 0.25rem 0',
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              fontSize: '2rem',
              letterSpacing: '0.05em'
            }}>
              {victim.name}
            </h2>

            <div style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-crimson)',
              fontSize: '0.9rem',
              marginBottom: '1.5rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              {t('pages.gameRoom.caseDetails.identificationCode')}{victim.id.toString().padStart(4, '0')}
            </div>

            <div style={{
              color: 'var(--text-secondary)',
              lineHeight: '1.7',
              whiteSpace: 'pre-wrap',
              maxHeight: '40vh',
              overflowY: 'auto',
              /* Swapped to logical property for scrolling clearance */
              paddingInlineEnd: '1rem',
              fontFamily: 'var(--font-mono)'
            }}>
              {victim.background || t('pages.gameRoom.caseDetails.noBackground')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}