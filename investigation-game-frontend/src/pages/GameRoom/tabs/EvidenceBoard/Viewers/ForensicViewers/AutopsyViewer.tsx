import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ForensicEvidence } from '@/types/evidence';
import './AutopsyViewer.css';

type AutopsyEvidence = Extract<ForensicEvidence, { sub_type: 'autopsy' }>;

interface AutopsyViewerProps {
  evidence: AutopsyEvidence;
}

const AutopsyViewer: React.FC<AutopsyViewerProps> = ({ evidence }) => {
  const { t } = useTranslation();
  const { metadata } = evidence;

  return (
    <div className="forensic-preview autopsy-paper">
      <div className="autopsy-header">
        <div className="autopsy-agency-block">
          <div className="autopsy-agency">{t('pages.gameRoom.evidence.viewers.autopsy.officeOfChief')}</div>
          <h2 className="autopsy-title">{t('pages.gameRoom.evidence.viewers.autopsy.reportOfAutopsy')}</h2>
          <div className="autopsy-sub-meta">{t('pages.gameRoom.evidence.viewers.autopsy.cityCountyMorgue')}</div>
        </div>
        <div className="autopsy-meta-box">
          <div><span className="autopsy-label">{t('pages.gameRoom.evidence.viewers.autopsy.caseNo')}</span> {evidence.id.toString().padStart(5, '0')}</div>
          <div><span className="autopsy-label">{t('pages.gameRoom.evidence.viewers.autopsy.date')}</span> {new Date().toLocaleDateString()}</div>
        </div>
      </div>

      <div className="autopsy-body-section">
        <div className="autopsy-data-col">
          <div className="autopsy-data-row">
            <span className="autopsy-label">{t('pages.gameRoom.evidence.viewers.autopsy.examiner')}</span>
            <span className="autopsy-value">{metadata.examiner}</span>
          </div>
          <div className="autopsy-data-row">
            <span className="autopsy-label">{t('pages.gameRoom.evidence.viewers.autopsy.estTimeOfDeath')}</span>
            <span className="autopsy-value">{metadata.time_of_death}</span>
          </div>
          <div className="autopsy-data-row critical-row">
            <span className="autopsy-label">{t('pages.gameRoom.evidence.viewers.autopsy.causeOfDeath')}</span>
            <span className="autopsy-value cause-of-death">{metadata.cause_of_death}</span>
          </div>

          <div className="autopsy-notes-section">
            <span className="autopsy-label">{t('pages.gameRoom.evidence.viewers.autopsy.externalExam')}</span>
            <div className="autopsy-notes-content">
              {metadata.anomalies || t('pages.gameRoom.evidence.viewers.autopsy.noAnomalies')}
            </div>
          </div>
        </div>

        <div className="autopsy-diagram-col">
          <svg viewBox="0 0 100 220" className="autopsy-body-wireframe">
            {/* Head */}
            <circle cx="50" cy="25" r="14" />
            {/* Torso */}
            <path d="M35 50 Q50 45 65 50 L60 110 L40 110 Z" />
            {/* Arms */}
            <path d="M30 55 Q20 80 15 110" />
            <path d="M70 55 Q80 80 85 110" />
            {/* Legs */}
            <path d="M42 115 L40 195" />
            <path d="M58 115 L60 195" />
            {/* Grid Overlay */}
            <line x1="0" y1="50" x2="100" y2="50" className="grid-line" />
            <line x1="0" y1="110" x2="100" y2="110" className="grid-line" />
            <line x1="50" y1="0" x2="50" y2="220" className="grid-line" />
          </svg>
          <div className="diagram-caption">{t('pages.gameRoom.evidence.viewers.autopsy.fig1')}</div>
        </div>
      </div>

      <div className="autopsy-footer">
        <div className="autopsy-stamp">{t('pages.gameRoom.evidence.viewers.autopsy.confidentialRecord')}</div>
        <div className="autopsy-signature-block">
          <div className="autopsy-signature">{metadata.examiner}</div>
          <div className="autopsy-signature-line">{t('pages.gameRoom.evidence.viewers.autopsy.chiefMedicalExaminer')}</div>
        </div>
      </div>
    </div>
  );
};

export default AutopsyViewer;