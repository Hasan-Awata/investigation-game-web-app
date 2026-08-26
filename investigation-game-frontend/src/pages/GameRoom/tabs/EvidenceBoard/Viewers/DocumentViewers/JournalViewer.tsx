import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DocumentEvidence } from '@/types/evidence';
import type { JournalPage } from '@/types/evidence/document';
import './JournalViewer.css';

type JournalEvidence = Extract<DocumentEvidence, { sub_type: 'journal' }>;

interface JournalViewerProps {
  evidence: JournalEvidence;
}

const JournalViewer: React.FC<JournalViewerProps> = ({ evidence }) => {
  const { t } = useTranslation();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const { owner, cover_title, pages = [] } = evidence.metadata;
  
  const activePage: JournalPage = pages[currentPageIndex] || { 
    page_number: 1, 
    content: t('pages.gameRoom.evidence.viewers.journal.empty') 
  };

  return (
    <div className="doc-preview journal-diary-preview">
      <div className="journal-spine-shadow"></div>

      <div className="journal-header">
        <div className="journal-meta-box">
          <div><span className="journal-label">{t('pages.gameRoom.evidence.viewers.journal.author')}</span> {owner}</div>
          {!activePage.is_torn && activePage.date_entry && (
            <div><span className="journal-label">{t('pages.gameRoom.evidence.viewers.journal.date')}</span> {activePage.date_entry}</div>
          )}
        </div>
        <div className="journal-tag">{cover_title || t('pages.gameRoom.evidence.viewers.journal.personalDiary')}</div>
      </div>

      <div className="journal-diary-body">
        {activePage.is_torn ? (
          <div className="journal-torn-page">
            {t('pages.gameRoom.evidence.viewers.journal.tornPage')}
          </div>
        ) : (
          activePage.content
        )}
      </div>

      {pages.length > 1 && (
        <div className="document-pagination">
          <button disabled={currentPageIndex === 0} onClick={() => setCurrentPageIndex(prev => prev - 1)}>
            &#8592; {t('pages.gameRoom.evidence.viewers.journal.prev')}
          </button>
          <span>
            {t('pages.gameRoom.evidence.viewers.journal.page')} {currentPageIndex + 1} {t('pages.gameRoom.evidence.viewers.journal.of')} {pages.length}
          </span>
          <button disabled={currentPageIndex === pages.length - 1} onClick={() => setCurrentPageIndex(prev => prev + 1)}>
            {t('pages.gameRoom.evidence.viewers.journal.next')} &#8594;
          </button>
        </div>
      )}
    </div>
  );
};

export default JournalViewer;