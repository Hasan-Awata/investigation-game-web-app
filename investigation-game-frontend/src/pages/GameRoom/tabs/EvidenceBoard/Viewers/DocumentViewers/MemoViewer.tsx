import React from 'react';
import type { DocumentEvidence } from '@/types/evidence';
import './MemoViewer.css';

type MemoEvidence = Extract<DocumentEvidence, { sub_type: 'memo' }>;

interface MemoViewerProps {
  evidence: MemoEvidence;
}

const MemoViewer: React.FC<MemoViewerProps> = ({ evidence }) => {
  const { context, style = 'notebook' } = evidence.metadata;

  // Fallback to evidence description if context is empty
  const displayText = context || evidence.description;

  if (style === 'sticky') {
    return (
      <div className="document-preview memo-sticky-preview">
        {/* A little piece of scotch tape at the top for realism */}
        <div className="sticky-tape"></div>
        <div className="memo-content">
          <p className="memo-body-text">{displayText}</p>
        </div>
      </div>
    );
  }

  // Default Notebook Fallback
  return (
    <div className="document-preview memo-preview">
      <div className="notebook-holes"></div>
      <div className="crumpled-texture"></div>

      <div className="memo-content">
        <p className="memo-body-text">{displayText}</p>
      </div>
    </div>
  );
};

export default MemoViewer;