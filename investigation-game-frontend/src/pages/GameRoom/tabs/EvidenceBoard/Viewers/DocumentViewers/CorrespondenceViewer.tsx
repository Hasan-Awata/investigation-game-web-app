import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DocumentEvidence } from '@/types/evidence';
import './CorrespondenceViewer.css';

type CorrespondenceEvidence = Extract<DocumentEvidence, { sub_type: 'correspondence' }>;

interface CorrespondenceViewerProps {
  evidence: CorrespondenceEvidence;
}

const CorrespondenceViewer: React.FC<CorrespondenceViewerProps> = ({ evidence }) => {
  const { t } = useTranslation();
  const { metadata } = evidence;

  return (
    <div className="correspondence-preview-wrapper">
      <div className="correspondence-paper-sheet">
        <div className="correspondence-stamp">{t('pages.gameRoom.evidence.viewers.correspondence.confidential')}</div>

        <div className="correspondence-header-block">
          <div className="correspondence-row">
            <span className="correspondence-label">{t('pages.gameRoom.evidence.viewers.correspondence.to')}</span>
            <span className="correspondence-val">{metadata.recipient}</span>
          </div>
          <div className="correspondence-row">
            <span className="correspondence-label">{t('pages.gameRoom.evidence.viewers.correspondence.from')}</span>
            <span className="correspondence-val">{metadata.sender}</span>
          </div>
          <div className="correspondence-row correspondence-subject-row">
            <span className="correspondence-label">{t('pages.gameRoom.evidence.viewers.correspondence.subject')}</span>
            <span className="correspondence-val">{metadata.subject}</span>
          </div>
        </div>

        <div className="correspondence-body-text">
          {metadata.body}
        </div>

        <div className="correspondence-footer-stamp">
          <span>{t('pages.gameRoom.evidence.viewers.correspondence.intelDivision')}</span>
        </div>
      </div>
    </div>
  );
};

export default CorrespondenceViewer;