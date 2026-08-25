import React, { useState } from 'react';
import type { FinancialMetadata, FinancialTransaction } from '@/types/evidence/document';

interface FinancialRecordProps {
  evidence: { id: number; metadata: FinancialMetadata; };
}

const FinancialRecordViewer: React.FC<FinancialRecordProps> = ({ evidence }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const metadata = evidence.metadata;
  const pages = metadata.pages || [];
  const activePage = pages[currentPageIndex] || { transactions: [], statement_period: 'N/A', page_number: 1 };

  return (
    <div className="financial-preview-wrapper">
      <div className="financial-watermark">CONFIDENTIAL</div>
      <div className="financial-stamp">SUBPOENAED RECORD</div>

      <div className="doc-header-block">
        <div className="financial-header-top">
          <h2>{metadata.institution_name}</h2>
          <div className="financial-barcode">*{evidence.id}*</div>
        </div>
        <div className="doc-meta-row">
          <div><span className="doc-meta-label">ACCOUNT:</span> <span>{metadata.account_holder}</span></div>
          <div><span className="doc-meta-label">ACCT NO:</span> <span>{metadata.account_number}</span></div>
          <div><span className="doc-meta-label">PERIOD:</span> <span>{activePage.statement_period}</span></div>
          <div><span className="doc-meta-label">DOC REF:</span> <span>EX-{evidence.id.toString().padStart(3, '0')}</span></div>
        </div>
      </div>
      
      <table className="financial-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Transaction Detail</th>
            <th className="amount-header">Amount</th>
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
                No ledger data available for this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="financial-footer">
        <span>AUTHORIZED BY DEPT OF TREASURY</span>
        
        {pages.length > 1 && (
          <div className="document-pagination">
            <button disabled={currentPageIndex === 0} onClick={() => setCurrentPageIndex(prev => prev - 1)}>&#8592; Prev</button>
            <span>PAGE {currentPageIndex + 1} OF {pages.length}</span>
            <button disabled={currentPageIndex === pages.length - 1} onClick={() => setCurrentPageIndex(prev => prev + 1)}>Next &#8594;</button>
          </div>
        )}
        
        {pages.length <= 1 && <span>PAGE 1 OF 1</span>}
      </div>
    </div>
  );
};

export default FinancialRecordViewer;