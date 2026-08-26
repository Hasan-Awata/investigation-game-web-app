import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DocumentEvidence } from '@/types/evidence';
import type { FinancialTransaction } from '@/types/evidence/document';
import './FinancialRecordViewer.css'; 

type FinancialEvidence = Extract<DocumentEvidence, { sub_type: 'financial' }>;

interface FinancialRecordProps {
  evidence: FinancialEvidence;
}

const FinancialRecordViewer: React.FC<FinancialRecordProps> = ({ evidence }) => {
  const { t } = useTranslation();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const metadata = evidence.metadata;
  const pages = metadata.pages || [];
  const activePage = pages[currentPageIndex] || { transactions: [], statement_period: 'N/A', page_number: 1 };

  return (
    <div className="financial-preview-wrapper">
      <div className="financial-watermark">{t('pages.gameRoom.evidence.viewers.financial.confidential')}</div>
      <div className="financial-stamp">{t('pages.gameRoom.evidence.viewers.financial.subpoenaedRecord')}</div>

      <div className="doc-header-block">
        <div className="financial-header-top">
          <h2>{metadata.institution_name}</h2>
          <div className="financial-barcode">*{evidence.id}*</div>
        </div>
        <div className="doc-meta-row">
          <div><span className="doc-meta-label">{t('pages.gameRoom.evidence.viewers.financial.account')}</span> <span>{metadata.account_holder}</span></div>
          <div><span className="doc-meta-label">{t('pages.gameRoom.evidence.viewers.financial.accountNo')}</span> <span>{metadata.account_number}</span></div>
          <div><span className="doc-meta-label">{t('pages.gameRoom.evidence.viewers.financial.period')}</span> <span>{activePage.statement_period}</span></div>
          <div><span className="doc-meta-label">{t('pages.gameRoom.evidence.viewers.financial.docRef')}</span> <span>EX-{evidence.id.toString().padStart(3, '0')}</span></div>
        </div>
      </div>

      <table className="financial-table">
        <thead>
          <tr>
            <th>{t('pages.gameRoom.evidence.viewers.financial.date')}</th>
            <th>{t('pages.gameRoom.evidence.viewers.financial.transactionDetail')}</th>
            <th className="amount-header">{t('pages.gameRoom.evidence.viewers.financial.amount')}</th>
          </tr>
        </thead>
        <tbody>
          {(activePage.transactions || []).map((tx: FinancialTransaction, idx: number) => (
            <tr key={idx}>
              <td className="date-col">{tx.date}</td>
              <td>{tx.description}</td>
              <td className={`amount-col ${tx.amount < 0 ? 'negative' : ''}`}>
                {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}

          {(!activePage.transactions || activePage.transactions.length === 0) && (
            <tr>
              <td colSpan={3} className="empty-ledger-msg">
                {t('pages.gameRoom.evidence.viewers.financial.noLedgerData')}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="financial-footer">
        <span>{t('pages.gameRoom.evidence.viewers.financial.authorizedBy')}</span>

        {pages.length > 1 && (
          <div className="document-pagination">
            <button disabled={currentPageIndex === 0} onClick={() => setCurrentPageIndex(prev => prev - 1)}>
              &#8592; {t('pages.gameRoom.evidence.viewers.financial.prev')}
            </button>
            <span>{t('pages.gameRoom.evidence.viewers.financial.page')} {currentPageIndex + 1} {t('pages.gameRoom.evidence.viewers.financial.of')} {pages.length}</span>
            <button disabled={currentPageIndex === pages.length - 1} onClick={() => setCurrentPageIndex(prev => prev + 1)}>
              {t('pages.gameRoom.evidence.viewers.financial.next')} &#8594;
            </button>
          </div>
        )}

        {pages.length <= 1 && <span>{t('pages.gameRoom.evidence.viewers.financial.page')} 1 {t('pages.gameRoom.evidence.viewers.financial.of')} 1</span>}
      </div>
    </div>
  );
};

export default FinancialRecordViewer;