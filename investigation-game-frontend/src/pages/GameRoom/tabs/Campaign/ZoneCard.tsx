import { useId, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Level, Zone } from '@/types';
import styles from './ZoneCard.module.css';

interface ZoneCardProps {
  zone: Zone;
  unlockedLevelIds: Set<number>;
  onClose: () => void;
  onEnter: (zoneId: number) => void;
}

type LeadState = 'available' | 'warrant' | 'restricted';

function LeadIcon({ state, type, label }: { state: LeadState; type?: Level['presentation_type']; label?: string }) {
  let shape;
  if (state === 'restricted') {
    shape = <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 1 1 8 0v4" /></>;
  } else if (type === 'interrogation') {
    shape = <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />;
  } else if (type === 'location') {
    shape = <><path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>;
  } else {
    shape = <><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>;
  }

  return (
    <svg role={label ? 'img' : undefined} aria-label={label} aria-hidden={!label} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {shape}
    </svg>
  );
}

export default function ZoneCard({ zone, unlockedLevelIds, onClose, onEnter }: ZoneCardProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
  const levels = [...(zone.levels ?? [])].sort((a, b) => a.order_index - b.order_index);
  const closeLabel = t('pages.gameRoom.campaign.map.closeEsc', 'Close (Esc)');
  const warrantLabel = t('pages.gameRoom.campaign.map.warrantRequired', 'Warrant required');

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={event => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={event => {
        if (pressedBackdrop.current && event.target === event.currentTarget) onClose();
        pressedBackdrop.current = false;
      }}
    >
      <div className={styles.dossier}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>{zone.title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label={closeLabel} title={closeLabel}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className={styles.body} tabIndex={0}>
          <p className={styles.description}>
            {zone.description || t('pages.gameRoom.campaign.map.noDescription', 'No description is available for this zone.')}
          </p>

          {levels.length === 0 ? (
            <p className={styles.empty}>{t('pages.gameRoom.campaign.noLeads', 'No leads are currently available in this zone.')}</p>
          ) : (
            <ul className={styles.leads} role="list">
              {levels.map(level => {
                const discovered = level.is_initial || unlockedLevelIds.has(level.id);
                const state: LeadState = !discovered ? 'restricted' : level.required_request_id ? 'warrant' : 'available';
                const warrantHint = state === 'warrant' ? warrantLabel : undefined;

                return (
                  <li key={level.id} className={styles.lead} data-state={state}>
                    <LeadIcon
                      state={state}
                      type={discovered ? level.presentation_type : undefined}
                      label={warrantHint}
                    />
                    <span className={styles.leadTitle}>
                      {discovered ? level.title : t('pages.gameRoom.campaign.unknownLead', 'Unknown lead')}
                    </span>
                    {warrantHint && <span className={styles.warrantHint} aria-hidden="true">{warrantHint}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.travel} onClick={() => onEnter(zone.id)}>
            {t('pages.gameRoom.campaign.map.travelToZone', 'Travel to Zone')}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
