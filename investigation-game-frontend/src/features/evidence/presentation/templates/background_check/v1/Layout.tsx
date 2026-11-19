import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { assetUrl } from '@/utils/assetUrl';
import type { LayoutProps } from '../../../catalog';
import definition from './definition.json';
import styles from './Layout.module.css';

const MAX_BODY_HEIGHT = 983;

function noteSegments(text: string): string[] {
  const segments: string[] = [];
  let segment = '';
  let lineBreaks = 0;
  for (const word of text.match(/[^\s]+|[^\S\n]+|\n/gu) ?? []) {
    if (segment && (segment.length + word.length > 380 || lineBreaks >= 8)) {
      segments.push(segment);
      segment = '';
      lineBreaks = 0;
    }
    if (word === '\n') lineBreaks++;
    const characters = Array.from(word);
    while (characters.length > 380) segments.push(characters.splice(0, 380).join(''));
    segment += characters.join('');
  }
  if (segment) segments.push(segment);
  return segments;
}

function ExhibitImage({ path, label, missing }: { path: string; label: string; missing: string }) {
  const [failed, setFailed] = useState('');
  const url = path.startsWith('blob:') ? path : assetUrl(path);
  return url && failed !== url ? <img src={url} alt={label} onError={() => setFailed(url)} /> : <span>{missing}</span>;
}

export default function Layout({ values, locale, pageLimit }: LayoutProps) {
  const measurement = useRef<HTMLDivElement>(null);
  const [breaks, setBreaks] = useState<number[]>([]);
  const label = (key: string) => definition.fields.find(field => field.key === key)?.label[locale] ?? key;
  const value = (key: string) => typeof values[key] === 'string' ? values[key] : '';
  const ar = locale === 'ar';
  const empty = (message: string) => <p className={styles.empty}>{message}</p>;
  const field = (key: string) => <div key={key}><dt>{label(key)}</dt><dd dir="auto">{value(key) || '—'}</dd></div>;
  const rows = Array.isArray(values.arrests) ? values.arrests : [];
  const tableHeader = [ar ? 'التاريخ' : 'Date', ar ? 'الوصف' : 'Description', ar ? 'النتيجة' : 'Disposition'];
  const sections: { group?: 'arrests' | 'notes'; content: ReactNode }[] = [
    { content: <><header className={styles.heading}><h1>{definition.name[locale]}</h1><span>{definition.category[locale]}</span></header>
      <section className={styles.identity} aria-label={ar ? 'الهوية' : 'Identity'}><figure><ExhibitImage key={value('portrait')} path={value('portrait')} label={label('portrait')} missing={ar ? 'الصورة غير متوفرة' : 'Photograph unavailable'} /></figure>
        <dl>{['subject', 'reference', 'birth_date', 'address', 'check_date'].map(field)}</dl>
      </section></> },
    ...rows.map(row => ({ group: 'arrests' as const, content: <div role="row" className={styles.row}>
      <span role="cell" dir="auto">{row.date || '—'}</span><span role="cell" dir="auto">{row.description || '—'}</span><span role="cell" dir="auto">{row.disposition || '—'}</span>
    </div> })),
    ...(!rows.length ? [{ content: <><h2>{label('arrests')}</h2>{empty(ar ? 'لا توجد مدخلات في السجل.' : 'No entries on record.')}</> }] : []),
    { content: <section><h2>{label('fingerprints')}</h2><div className={styles.fingerprints}><ExhibitImage key={value('fingerprints')} path={value('fingerprints')} label={label('fingerprints')} missing={ar ? 'البصمات غير متوفرة' : 'Prints unavailable'} /></div></section> },
    ...noteSegments(value('notes')).map(note => ({ group: 'notes' as const, content: <p dir="auto" className={styles.note}>{note}</p> })),
    { content: <section><h2>{ar ? 'اعتماد التقرير' : 'Sign-off'}</h2><dl className={styles.signoff}>{field('reviewer')}{field('signed_date')}</dl></section> },
  ];
  const heading = (group: 'arrests' | 'notes') => <div className={styles.groupHeading}><h2>{label(group)}</h2>{group === 'arrests' && <div className={styles.row} role="row">{tableHeader.map(title => <strong role="columnheader" key={title}>{title}</strong>)}</div>}</div>;

  useLayoutEffect(() => {
    const root = measurement.current;
    if (!root) return;
    const measure = () => {
      const elements = Array.from(root.children) as HTMLElement[];
      const headers = new Map(elements.slice(0, 2).map(element => [element.dataset.group, element.offsetHeight]));
      const next: number[] = [];
      let used = 0;
      let previous: string | undefined;
      elements.slice(2).forEach((element, index) => {
        const group = element.dataset.group;
        const header = headers.get(group) ?? 0;
        const required = element.offsetHeight + (group === previous ? 0 : header);
        if (used && used + required > MAX_BODY_HEIGHT) {
          next.push(index);
          used = element.offsetHeight + header;
        } else used += required;
        previous = group;
      });
      setBreaks(current => current.join() === next.join() ? current : next);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [values, locale]);

  const renderPage = (start: number, end: number) => {
    const groups: { group?: 'arrests' | 'notes'; items: ReactNode[]; index: number }[] = [];
    sections.slice(start, end).forEach(({ group, content }, offset) => {
      const previous = groups.at(-1);
      const item = <div className={styles.item} role={group === 'arrests' ? 'presentation' : undefined} key={offset}>{content}</div>;
      if (group && previous?.group === group) previous.items.push(item);
      else groups.push({ group, items: [item], index: offset });
    });
    return groups.map(({ group, items, index }) => group ? <section key={index} role={group === 'arrests' ? 'table' : undefined} aria-label={label(group)}>{heading(group)}{items}</section> : <div key={index}>{items}</div>);
  };

  return <div className={styles.report}>
    <div ref={measurement} className={styles.measure} aria-hidden="true" inert>
      {(['arrests', 'notes'] as const).map(group => <div key={group} data-group={group}>{heading(group)}</div>)}
      {sections.map(({ group, content }, index) => <div key={index} className={styles.item} data-group={group}>{content}</div>)}
    </div>
    {[0, ...breaks].slice(0, pageLimit).map((start, index) => <article className={styles.page} key={start}>
      {index > 0 && <div className={styles.continuation}>{definition.name[locale]} / <bdi>{value('reference') || value('subject')}</bdi></div>}
      {renderPage(start, breaks[index])}
      <footer>{new Intl.NumberFormat(locale).format(index + 1)}</footer>
    </article>)}
  </div>;
}
