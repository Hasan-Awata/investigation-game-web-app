import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomData, useRoomUI } from '@/context/RoomContext';
import type { EvidenceBoardEntry } from '@/types';
import EvidenceCard from './EvidenceCard';
import EvidenceModal from './EvidenceModal';
import styles from './EvidenceBoardTab.module.css';

const EvidenceGrid = React.memo(({ 
  evidences, 
  viewedEvidences, 
  onInspect 
}: { 
  evidences: EvidenceBoardEntry[]; 
  viewedEvidences: Set<number>; 
  onInspect: (evidence: EvidenceBoardEntry) => void;
}) => {
  return (
    <div className={styles.evidenceScatterGrid}>
      {evidences.map((evidence, index) => (
        <EvidenceCard
          key={evidence.id}
          evidence={evidence}
          index={index}
          isNew={!viewedEvidences.has(evidence.id)}
          onInspect={onInspect}
        />
      ))}
    </div>
  );
});

export default function EvidenceBoardTab() {
  const { t } = useTranslation();
  const { accumulatedEvidences } = useRoomData();
  const { viewedEvidences, markEvidenceAsViewed } = useRoomUI();
  const [inspectedEvidence, setInspectedEvidence] = useState<EvidenceBoardEntry | null>(null);

  const handleInspect = useCallback((evidence: EvidenceBoardEntry) => {
    setInspectedEvidence(evidence);
    markEvidenceAsViewed(evidence.id);
  }, [markEvidenceAsViewed]);

  return (
    <div className={styles.evidenceBoardContainer}>
      <header className={styles.boardHeader}>
        <span className={styles.boardMeta}>{t('pages.gameRoom.evidence.board.subtitle')}</span>
      </header>

      <div className={styles.evidenceWorkspace}>
        {accumulatedEvidences.length === 0 ? (
          <div className="terminal-text" style={{ textAlign: 'center' }}>
            {t('pages.gameRoom.evidence.board.noEvidence')}
          </div>
        ) : (
          <EvidenceGrid 
            evidences={accumulatedEvidences} 
            viewedEvidences={viewedEvidences} 
            onInspect={handleInspect} 
          />
        )}
      </div>

      <EvidenceModal evidence={inspectedEvidence} onClose={() => setInspectedEvidence(null)} />
    </div>
  );
}