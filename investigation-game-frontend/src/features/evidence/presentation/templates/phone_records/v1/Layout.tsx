import { useLayoutEffect } from 'react';
import type { LayoutProps } from '../../../catalog';
import { agencySeal, documentAsset, documentStamp } from '../../../documentAssets';
import stampText from '../../../stampText.module.css';
import definition from './definition.json';
import styles from './Layout.module.css';

const callLog = definition.fields.find(field => field.key === 'calls')!;
const communicationsSeal = agencySeal('communications');
const columns = callLog.fields ?? [];
const labels = new Map(definition.fields.map(field => [field.key, field.label]));
const details = ['main_line', 'line_owner', 'provider'];
const copy = {
  en: { agency: 'Ministry of Telecommunications', handling: 'Confidential · For official use only', release: 'Declassified Evidence', empty: 'No activity recorded.' },
  ar: { agency: 'وزارة الاتصالات', handling: 'سري . للاستخدام الرسمي فقط', release: 'أدلة رُفعت عنها السرية', empty: 'لا توجد سجلات.' },
};

function legacyDuration(seconds: string) {
  if (!/^\d{1,8}$/.test(seconds)) return seconds;
  const total = Number(seconds);
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
    .map(part => String(part).padStart(2, '0')).join(':');
}

export default function Layout({ values, locale, pageSelection }: LayoutProps) {
  const value = (key: string) => typeof values[key] === 'string' ? values[key] : '';
  const label = (key: string) => labels.get(key)?.[locale];
  const calls = Array.isArray(values.calls) ? values.calls : [];
  const onPageCountChange = pageSelection?.onPageCountChange;
  useLayoutEffect(() => { onPageCountChange?.(1); }, [onPageCountChange]);

  const mainLine = value('main_line');
  const signature = documentAsset('signature', value('signature_asset'));
  const stamp = documentStamp('verified_evidence', locale);

  return (
    <article className={styles.sheet}>
      <header className={styles.letterhead}>
        <div>
          <p className={styles.agency}>{copy[locale].agency}</p>
          <h1>{locale === 'ar' ? callLog.label.ar : definition.name.en}</h1>
          <p className={styles.subtitle}>{copy[locale].handling}</p>
        </div>
        <img className={styles.emblem} src={communicationsSeal} alt="" draggable={false} />
        <dl className={styles.caseBox}>
          <dt>{label('case_number')}</dt>
          <dd><bdi>{value('case_number') || '—'}</bdi></dd>
        </dl>
      </header>

      <dl className={styles.details}>
        {details.map(key => <div key={key}>
          <dt>{label(key)}</dt><dd><bdi>{value(key) || '—'}</bdi></dd>
        </div>)}
      </dl>

      <table className={styles.calls} aria-label={callLog.label[locale]}>
        <thead><tr>{columns.map(column => (
          <th scope="col" key={column.key}>{column.label[locale]}</th>
        ))}</tr></thead>
        <tbody>
          {calls.map((call, index) => {
            // Older v1 records store the remote party, direction and raw seconds.
            const row: Record<string, string> = call.time && !call.date_time ? {
              date_time: [value('date'), call.time].filter(Boolean).join(' '),
              originating: call.direction === 'in' ? call.number : call.direction === 'out' ? mainLine : '',
              destination: call.direction === 'out' ? call.number : call.direction === 'in' ? mainLine : '',
              duration: legacyDuration(call.seconds ?? ''),
              type: 'CALL',
            } : call;
            return <tr key={index}>{columns.map(column => (
              <td key={column.key}><bdi>{row[column.key] || '—'}</bdi></td>
            ))}</tr>;
          })}
          {!calls.length && <tr><td className={styles.empty} colSpan={columns.length}>{copy[locale].empty}</td></tr>}
        </tbody>
      </table>

      <footer className={styles.footer}>
        <dl className={styles.approval}>
          <dt>{label('approved_by')}</dt>
          <dd>
            <div className={styles.signatureLine}>
              {signature && <img src={signature.url} alt={label('signature_asset')} draggable={false} />}
            </div>
            <bdi>{value('approved_by') || '—'}</bdi>
          </dd>
        </dl>
        {stamp && <div className={styles.stamp}>
          <img src={stamp.url} alt={stamp.label[locale]} width={359} height={426} draggable={false} />
          <strong className={stampText.ink}>{copy[locale].release}</strong>
        </div>}
      </footer>
    </article>
  );
}
