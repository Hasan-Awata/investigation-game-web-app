import React, { useState } from 'react';
import type { ContractMetadata } from '@/types/evidence/document';

interface ContractViewerProps {
  evidence: { id: number; metadata: ContractMetadata; };
}

const ContractViewer: React.FC<ContractViewerProps> = ({ evidence }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const { parties_involved, signatures_valid, execution_date, pages = [] } = evidence.metadata;
  const activePage = pages[currentPageIndex] || { terms_text: 'No terms available.', page_number: 1 };
  
  const isFirstPage = currentPageIndex === 0;
  const isLastPage = currentPageIndex === pages.length - 1 || pages.length === 0;

  const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const getSignatures = (evidenceId: number, min: number, max: number) => {
    const range = max - min + 1;
    const idx1Offset = evidenceId % range;
    const idx1 = min + idx1Offset;
    
    let idx2Offset = (evidenceId + 2) % range;
    if (idx1Offset === idx2Offset) idx2Offset = (idx1Offset + 1) % range;
    const idx2 = min + idx2Offset;
    
    const getFileName = (idx: number) => idx === 0 ? 'signature.svg' : `signature-${idx}.svg`;
    return [
      `${backendUrl}/assets/signatures/${getFileName(idx1)}`,
      `${backendUrl}/assets/signatures/${getFileName(idx2)}`
    ];
  };

  const [sig1, sig2] = getSignatures(evidence.id, 0, 18);

  return (
    <div className="doc-preview contract-legal-preview">
      <div className="contract-watermark">BINDING AGREEMENT</div>
      
      <div className="contract-header">
        <h2 className="contract-title">DEED OF AGREEMENT</h2>
        <div className="contract-subtitle">OFFICIAL LEGAL INSTRUMENT // NOTARY VERIFIED</div>
      </div>

      {isFirstPage && (
        <div className="contract-section">
          <span className="contract-label">BETWEEN THE PARTIES:</span>
          <ul className="contract-parties-list">
            {(parties_involved || []).map((party: string, idx: number) => (
              <li key={idx}><strong>Party {idx + 1}:</strong> {party}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="contract-section contract-terms-container">
        <span className="contract-label">TERMS AND CONDITIONS (PAGE {activePage.page_number}):</span>
        <div className="contract-terms-text">
          {activePage.terms_text}
        </div>
      </div>

      {isLastPage && (
        <div className="contract-signoff-wrapper">
          {execution_date && (
            <div className="contract-section">
              <div className="contract-terms-text contract-execution-date">
                IN WITNESS WHEREOF, the parties hereto have executed this Agreement as of <strong>{execution_date}</strong>.
              </div>
            </div>
          )}

          <div className="contract-signature-block">
            <div className="signature-col">
              <div className="signature-line-wrapper">
                <img src={sig1} alt="Authorized Signature" className="rendered-signature-img" />
                <div className="contract-signature-line"></div>
              </div>
              <span className="signature-caption">Authorized Representative</span>
            </div>
            <div className="signature-col">
              <div className="signature-line-wrapper">
                <img src={sig2} alt="Witness Signature" className="rendered-signature-img" />
                <div className="contract-signature-line"></div>
              </div>
              <span className="signature-caption">Witness</span>
            </div>
          </div>

          <div className={`contract-validation-stamp ${signatures_valid ? 'valid' : 'forged'}`}>
            {signatures_valid ? 'VERIFIED: NOTARIZED' : 'FLAGGED: FRAUDULENT'}
          </div>
        </div>
      )}

      {pages.length > 1 && (
        <div className="document-pagination">
          <button disabled={isFirstPage} onClick={() => setCurrentPageIndex(prev => prev - 1)}>&#8592; Prev</button>
          <span>PAGE {currentPageIndex + 1} OF {pages.length}</span>
          <button disabled={isLastPage} onClick={() => setCurrentPageIndex(prev => prev + 1)}>Next &#8594;</button>
        </div>
      )}
    </div>
  );
};

export default ContractViewer;