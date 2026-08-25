import React, { useState } from 'react';
import type { JournalMetadata, JournalPage } from '@/types/evidence/document';

interface JournalViewerProps {
  evidence: { id: number; metadata: JournalMetadata; };
}

const JournalViewer: React.FC<JournalViewerProps> = ({ evidence }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const { owner, cover_title, pages = [] } = evidence.metadata;
  const activePage: JournalPage = pages[currentPageIndex] || { page_number: 1, content: 'This journal appears to be empty.' };

  return (
    <div className="doc-preview journal-diary-preview">
      <div className="journal-spine-shadow"></div>
      
      <div className="journal-header">
        <div className="journal-meta-box">
          <div><span className="journal-label">AUTHOR:</span> {owner}</div>
          {!activePage.is_torn && activePage.date_entry && (
            <div><span className="journal-label">DATE:</span> {activePage.date_entry}</div>
          )}
        </div>
        <div className="journal-tag">{cover_title || 'PERSONAL DIARY ENTRY'}</div>
      </div>

      <div className="journal-diary-body">
        {activePage.is_torn ? (
          <div className="journal-torn-page">
            [ PAGE TORN OUT - EVIDENCE MISSING ]
          </div>
        ) : (
          activePage.content
        )}
      </div>

      {pages.length > 1 && (
        <div className="document-pagination">
          <button disabled={currentPageIndex === 0} onClick={() => setCurrentPageIndex(prev => prev - 1)}>&#8592; Prev</button>
          <span>PAGE {currentPageIndex + 1} OF {pages.length}</span>
          <button disabled={currentPageIndex === pages.length - 1} onClick={() => setCurrentPageIndex(prev => prev + 1)}>Next &#8594;</button>
        </div>
      )}
    </div>
  );
};

export default JournalViewer;