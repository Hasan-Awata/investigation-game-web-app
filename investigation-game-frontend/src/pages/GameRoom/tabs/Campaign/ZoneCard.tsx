import { useTranslation } from 'react-i18next';
import type { Zone } from '@/types';
import styles from './ZoneCard.module.css';

interface ZoneCardProps {
  zone: Zone;
  unlockedLevelIds: Set<number>;
  onClose: () => void;
  onEnter: (zoneId: number) => void;
}

const getLevelIcon = (type?: string) => {
  switch (type) {
    case 'interrogation':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      );
    case 'location':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      );
    case 'wiretap':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
        </svg>
      );
  }
};

export default function ZoneCard({ zone, unlockedLevelIds, onClose, onEnter }: ZoneCardProps) {
  const { t } = useTranslation();

  const levels = zone.levels ? [...zone.levels].sort((a, b) => a.order_index - b.order_index) : [];

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        
        <button className={styles.closeBtn} onClick={onClose} title="Close">✕</button>

        <div className={styles.zoneHeader}>
          <h2 className={styles.zoneTitle}>{zone.title}</h2>
        </div>

        <p className={styles.zoneDesc}>
          {zone.description || t('pages.gameRoom.campaign.map.noDescription')}
        </p>

        <div className={styles.levelsContainer}>
          <div className={styles.levelsHeaderWrapper}>
            <h4 className={styles.levelsHeading}>{t('pages.gameRoom.campaign.map.activeLeads', 'Active Leads')}</h4>
            <span className={styles.levelsCount}>
              {t('pages.gameRoom.campaign.map.entriesCount', { count: levels.length })}
            </span>
          </div>

          <ul className={styles.levelsList}>
            {levels.map(level => {
              const isDiscovered = level.is_initial || unlockedLevelIds.has(level.id);
              const isGated = isDiscovered && level.required_request_id; 

              let stateClass = styles.undiscovered;
              if (isDiscovered) {
                stateClass = isGated ? styles.gated : styles.actionable;
              }

              return (
                <li key={level.id} className={`${styles.levelItem} ${stateClass}`}>
                  <div className={styles.levelIcon}>
                    {isDiscovered ? getLevelIcon(level.presentation_type) : '❓'}
                  </div>
                  <div className={styles.levelData}>
                    <span className={styles.levelTitle}>
                      {isDiscovered ? level.title : t('pages.gameRoom.campaign.unknownLead', 'UNKNOWN LEAD')}
                    </span>
                    <span className={styles.levelStatusText}>
                      {isGated 
                        ? t('pages.gameRoom.campaign.map.warrantRequired', 'WARRANT REQUIRED') 
                        : isDiscovered 
                          ? t('pages.gameRoom.campaign.map.dataAvailable') 
                          : t('pages.gameRoom.campaign.map.restricted')
                      }
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={styles.zoneActions}>
          <button className={styles.btnPrimary} onClick={() => onEnter(zone.id)}>
            {t('pages.gameRoom.campaign.map.travelToZone', 'Travel to Zone')}
          </button>
        </div>
      </div>
    </div>
  );
}