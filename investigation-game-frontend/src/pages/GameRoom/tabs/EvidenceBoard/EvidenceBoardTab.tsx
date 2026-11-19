import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomData, useRoomUI } from '@/context/RoomContext.shared';
import type { Evidence } from '@/types';
import EvidenceCard from './EvidenceCard';
import EvidenceModal from './EvidenceModal';
import { useEvidenceGridMotion } from './useEvidenceGridMotion';
import styles from './EvidenceBoardTab.module.css';

const EvidenceGrid = memo(function EvidenceGrid({
  evidences,
  viewedEvidences,
  onInspect
}: {
  evidences: Evidence[];
  viewedEvidences: Set<number>;
  onInspect: (evidence: Evidence) => void;
}) {
  const gridRef = useEvidenceGridMotion(evidences);

  return (
    <div ref={gridRef} className={styles.evidenceGrid}>
      {evidences.map(evidence => (
        <EvidenceCard
          key={evidence.id}
          evidence={evidence}
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
  const [inspectedEvidence, setInspectedEvidence] = useState<Evidence | null>(null);

  const handleInspect = useCallback((evidence: Evidence) => {
    setInspectedEvidence(evidence);
    markEvidenceAsViewed(evidence.id);
  }, [markEvidenceAsViewed]);

  return (
    <div className={styles.evidenceBoardContainer}>
      <div className={styles.evidenceWorkspace}>
        {accumulatedEvidences.length === 0 ? (
          <div className={"terminal-text " + styles.emptyState}>
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
