import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DocumentEvidence } from '@/types/evidence';
import './ContractViewer.css';

type ContractEvidence = Extract<DocumentEvidence, { sub_type: 'contract' }>;

interface ContractViewerProps {
  evidence: ContractEvidence;
}

const ContractViewer: React.FC<ContractViewerProps> = ({ evidence }) => {
  const { t } = useTranslation();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const { parties_involved, signatures_valid, execution_date, pages = [] } = evidence.metadata;
  
  const activePage = pages[currentPageIndex] || { 
    terms_text: t('pages.gameRoom.evidence.viewers.contract.noTerms'), 
    page_number: 1 
  };

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
      <div className="contract-watermark">{t('pages.gameRoom.evidence.viewers.contract.bindingAgreement')}</div>

      <div className="contract-header">
        <h2 className="contract-title">{t('pages.gameRoom.evidence.viewers.contract.deedOfAgreement')}</h2>
        <div className="contract-subtitle">{t('pages.gameRoom.evidence.viewers.contract.officialInstrument')}</div>
      </div>

      {isFirstPage && (
        <div className="contract-section">
          <span className="contract-label">{t('pages.gameRoom.evidence.viewers.contract.betweenParties')}</span>
          <ul className="contract-parties-list">
            {(parties_involved || []).map((party: string, idx: number) => (
              <li key={idx}><strong>{t('pages.gameRoom.evidence.viewers.contract.party')} {idx + 1}:</strong> {party}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="contract-section contract-terms-container">
        <span className="contract-label">
          {t('pages.gameRoom.evidence.viewers.contract.termsAndConditions')} {activePage.page_number}):
        </span>
        <div className="contract-terms-text">
          {activePage.terms_text}
        </div>
      </div>

      {isLastPage && (
        <div className="contract-signoff-wrapper">
          {execution_date && (
            <div className="contract-section">
              <div className="contract-terms-text contract-execution-date">
                {t('pages.gameRoom.evidence.viewers.contract.inWitnessWhereof')} <strong>{execution_date}</strong>.
              </div>
            </div>
          )}

          <div className="contract-signature-block">
            <div className="signature-col">
              <div className="signature-line-wrapper">
                <img src={sig1} alt="Authorized Signature" className="rendered-signature-img" />
                <div className="contract-signature-line"></div>
              </div>
              <span className="signature-caption">{t('pages.gameRoom.evidence.viewers.contract.authorizedRep')}</span>
            </div>
            <div className="signature-col">
              <div className="signature-line-wrapper">
                <img src={sig2} alt="Witness Signature" className="rendered-signature-img" />
                <div className="contract-signature-line"></div>
              </div>
              <span className="signature-caption">{t('pages.gameRoom.evidence.viewers.contract.witness')}</span>
            </div>
          </div>

          <div className={`contract-validation-stamp ${signatures_valid ? 'valid' : 'forged'}`}>
            {signatures_valid 
              ? t('pages.gameRoom.evidence.viewers.contract.verifiedNotarized') 
              : t('pages.gameRoom.evidence.viewers.contract.flaggedFraudulent')}
          </div>
        </div>
      )}

      {pages.length > 1 && (
        <div className="document-pagination">
          <button disabled={isFirstPage} onClick={() => setCurrentPageIndex(prev => prev - 1)}>
            &#8592; {t('pages.gameRoom.evidence.viewers.contract.prev')}
          </button>
          <span>
            {t('pages.gameRoom.evidence.viewers.contract.page')} {currentPageIndex + 1} {t('pages.gameRoom.evidence.viewers.contract.of')} {pages.length}
          </span>
          <button disabled={isLastPage} onClick={() => setCurrentPageIndex(prev => prev + 1)}>
            {t('pages.gameRoom.evidence.viewers.contract.next')} &#8594;
          </button>
        </div>
      )}
    </div>
  );
};

export default ContractViewer;