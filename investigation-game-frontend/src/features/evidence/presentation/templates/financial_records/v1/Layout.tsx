import { useLayoutEffect, useRef, useState } from 'react';
import type { Definition } from '../../../../model';
import type { LayoutProps } from '../../../catalog';
import { agencySeal, documentAsset, documentStamp } from '../../../documentAssets';
import stampText from '../../../stampText.module.css';
import definition from './definition.json';
import styles from './Layout.module.css';

const fields = (definition as Definition).fields;
const financeSeal = agencySeal('finance');
const labels = new Map(fields.map(field => [field.key, field.label]));
const columns = fields.find(field => field.kind === 'rows')?.fields ?? [];
const caseFields = ['case_number', 'subject', 'target', 'depository_institution', 'account_opening_date', 'case_status'];
const signoffFields = ['prepared_by', 'prepared_date', 'approved_by', 'approved_date'];
const signatureFields = new Map([['prepared_by', 'prepared_signature'], ['approved_by', 'approved_signature']]);
const legacyHeaderLabels = new Set(['سري', 'سرّي', 'secret', 'classified', 'archived', 'مؤرشف']);
const copy = {
  en: { title: 'Financial Record', empty: 'No transactions recorded.', archived: 'Archived', authority: 'Anti-Corruption Authority' },
  ar: { title: 'كشف سجل مالي', empty: 'لا توجد معاملات مسجّلة.', archived: 'مؤرشف', authority: 'هيئة مكافحة الفساد' },
};

function amountWithoutCurrency(amount: string) {
  const numeric = amount.replace(/\p{Sc}/gu, '').match(
    /^\s*(?:[A-Z]{3}\s*)?(\(?[+\-−]?\s*\p{Nd}[\p{Nd}.,٬٫\s]*\)?)\s*(?:[A-Z]{3})?\s*$/u,
  );
  return numeric?.[1].trim() ?? amount;
}

export default function Layout({ values, locale, pageSelection }: LayoutProps) {
  const sheetRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const value = (key: string) => typeof values[key] === 'string' ? values[key] : '';
  const transactions = Array.isArray(values.transactions) ? values.transactions : [];
  const onPageCountChange = pageSelection?.onPageCountChange;
  useLayoutEffect(() => { onPageCountChange?.(1); }, [onPageCountChange]);
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    const content = contentRef.current;
    if (!sheet || !content) return;

    const fitToPaper = () => {
      if (sheet.clientHeight && content.offsetHeight) {
        setScale(Math.min(1, sheet.clientHeight / content.offsetHeight));
      }
    };
    fitToPaper();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(fitToPaper);
    observer.observe(content);
    return () => observer.disconnect();
  }, [values, locale]);

  const headerLabel = value('classification').trim();
  const archiveLabel = !headerLabel || legacyHeaderLabels.has(headerLabel.toLowerCase()) ? copy[locale].archived : headerLabel;
  const certification = value('certification');
  const filingStamp = documentStamp(value('stamp_asset') || 'under_investigation', locale);
  const classificationStamp = documentStamp('top_secret', locale);
  const authorityStamp = documentStamp('officially_certified', locale);
  const fileId = value('file_id');
  const pageReference = value('page_reference');
  const barcode = fileId && /^[0-9A-Z .$/+%-]+$/i.test(fileId) ? `*${fileId.toUpperCase()}*` : '';

  const detail = (key: string) => {
    const content = value(key);
    const isDate = key.endsWith('_date');
    const signatureKey = signatureFields.get(key);
    const signature = signatureKey && documentAsset('signature', value(signatureKey));
    return (
      <div key={key}>
        <dt>{labels.get(key)?.[locale]}</dt>
        <dd>
          {isDate && content ? <time dateTime={content} dir="ltr">{content}</time> : <bdi>{content || '—'}</bdi>}
          {signatureKey && signature && <img className={styles.signature} src={signature.url}
            alt={labels.get(signatureKey)?.[locale]} draggable={false} />}
        </dd>
      </div>
    );
  };

  return (
    <article className={styles.sheet} ref={sheetRef}>
      <div className={styles.content} ref={contentRef} style={scale < 1 ? { transform: `scale(${scale})` } : undefined}>
        <header className={styles.header}>
          <img className={styles.seal} src={financeSeal}
            alt={locale === 'ar' ? 'وزارة المالية' : 'Ministry of Finance'} draggable={false} />
          <h1 className={styles.title}>{copy[locale].title}</h1>
          <div className={styles.archiveStamp}
            style={classificationStamp && { borderImageSource: `url("${classificationStamp.url}")` }}>
            <bdi className={stampText.ink}>{archiveLabel}</bdi>
          </div>
        </header>

        <dl className={styles.caseDetails}>{caseFields.map(detail)}</dl>

        <table className={styles.transactions} aria-label={labels.get('transactions')?.[locale]}>
          <colgroup>
            <col className={styles.dateColumn} />
            <col /><col />
            <col className={styles.amountColumn} />
            <col className={styles.idColumn} />
            <col className={styles.statusColumn} />
          </colgroup>
          <thead><tr>{columns.map(column => (
            <th key={column.key} data-column={column.key} scope="col">{column.label[locale]}</th>
          ))}</tr></thead>
          <tbody>
            {transactions.map((transaction, index) => (
              <tr key={index}>
                {columns.map(column => {
                  const content = transaction[column.key] ?? '';
                  const isAmount = column.key === 'amount';
                  return (
                    <td key={column.key} data-column={column.key}>
                      {column.kind === 'date' && content
                        ? <time dateTime={content} dir="ltr">{content}</time>
                        : <bdi>{(isAmount ? amountWithoutCurrency(content) : content) || '—'}</bdi>}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!transactions.length && <tr><td colSpan={columns.length}>{copy[locale].empty}</td></tr>}
          </tbody>
        </table>

        <footer className={styles.footer}>
          <dl className={styles.signoff}>
            {signoffFields.map(detail)}
          </dl>
          <div className={styles.attestation}>
            <dl>{detail('declassification')}</dl>
            {filingStamp && <div className={styles.roundStamp}>
              <img src={filingStamp.url} alt={filingStamp.frame ? '' : filingStamp.label[locale]} draggable={false} />
              <bdi className={stampText.ink}>{certification || (filingStamp.frame ? filingStamp.label[locale] : '')}</bdi>
            </div>}
            {authorityStamp && <div className={styles.authorityStamp}>
              <img src={authorityStamp.url} alt={authorityStamp.label[locale]} width={359} height={441} draggable={false} />
              <bdi className={stampText.ink}>{copy[locale].authority}</bdi>
            </div>}
          </div>
          {(fileId || pageReference) && (
            <div className={styles.filing}>
              {fileId && <div className={styles.fileId}>
                {barcode && <span className={styles.barcode} dir="ltr" aria-hidden="true">{barcode}</span>}
                <span>{labels.get('file_id')?.[locale]} <bdi>{fileId}</bdi></span>
              </div>}
              {pageReference && <p dir="auto">{pageReference}</p>}
              {barcode && <span className={styles.barcode} dir="ltr" aria-hidden="true">{barcode}</span>}
            </div>
          )}
        </footer>
      </div>
    </article>
  );
}
