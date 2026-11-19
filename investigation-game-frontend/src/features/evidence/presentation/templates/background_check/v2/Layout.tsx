import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ShieldStarIcon } from '@phosphor-icons/react/dist/icons/ShieldStar';
import { assetUrl } from '@/utils/assetUrl';
import type { LayoutProps } from '../../../catalog';
import definition from './definition.json';
import styles from './Layout.module.css';

const fields = new Map(definition.fields.map(field => [field.key, field]));
const arrestColumns = definition.fields.find(field => field.key === 'arrests')?.fields ?? [];
const prints = [
  'right_thumb', 'right_index', 'right_middle', 'right_ring', 'right_little',
  'left_thumb', 'left_index', 'left_middle', 'left_ring', 'left_little',
];
const traits = [
  'nationality', 'citizen', 'gender', 'race_ethnicity', 'height', 'weight', 'eye_color', 'hair_color',
];

type Group = 'arrests' | 'notes';
type Block = { content: ReactNode; group?: Group };

function splitNotes(text: string): string[] {
  if (!text.trim()) return [];
  const segments: string[] = [];
  let segment: string[] = [];
  let lines = 1;
  let length = 0;
  for (const token of text.match(/[^\s]+|[^\S\n]+|\n/gu) ?? []) {
    const characters = Array.from(token);
    let limit = segments.length ? 750 : 310;
    const lineLimit = segments.length ? 16 : 8;
    if (length && (length + characters.length > limit || (token === '\n' && lines >= lineLimit))) {
      segments.push(segment.join(''));
      segment = [];
      length = 0;
      lines = 1;
      limit = 750;
    }
    while (characters.length > limit) {
      segments.push(characters.splice(0, limit).join(''));
      limit = 750;
    }
    segment.push(characters.join(''));
    length += characters.length;
    if (token === '\n') lines++;
  }
  if (length) segments.push(segment.join(''));
  return segments;
}

function ExhibitImage({ path, label, missing }: { path: string; label: string; missing: string }) {
  const [failed, setFailed] = useState('');
  const url = path.startsWith('blob:') ? path : assetUrl(path);
  if (!url || failed === url) return <span className={styles.imageFallback}>{missing}</span>;
  return <img src={url} alt={label} onError={() => setFailed(url)} draggable={false} />;
}

function BureauSeal({ watermark = false }: { watermark?: boolean }) {
  return <span className={watermark ? styles.watermark : styles.seal} aria-hidden="true">
    <ShieldStarIcon weight="regular" />
  </span>;
}

export default function Layout({ values, locale, pageLimit, pageSelection }: LayoutProps) {
  const measureBody = useRef<HTMLDivElement>(null);
  const measureBlocks = useRef<HTMLDivElement>(null);
  const [breaks, setBreaks] = useState<number[]>([]);
  const tr = (en: string, ar: string) => locale === 'ar' ? ar : en;
  const label = (key: string) => fields.get(key)?.label[locale] ?? key;
  const value = (key: string) => typeof values[key] === 'string' ? values[key] : '';
  const field = (key: string, content?: ReactNode) => (
    <div className={styles.field} key={key}>
      <dt>{label(key)}</dt>
      <dd>{content ?? (fields.get(key)?.kind === 'date' && value(key)
        ? <time dateTime={value(key)} dir="ltr">{value(key)}</time>
        : <bdi>{value(key) || '—'}</bdi>)}</dd>
    </div>
  );
  const image = (key: string, missing: string) => (
    <ExhibitImage key={value(key)} path={value(key)} label={label(key)} missing={missing} />
  );
  const rows = Array.isArray(values.arrests) ? values.arrests : [];
  const [firstNote, ...remainingNotes] = splitNotes(value('notes'));
  const recordId = value('record_id');
  const recordCharacters = Array.from(recordId);
  const useRecordBoxes = /^[A-Za-z0-9٠-٩۰-۹-]{0,12}$/u.test(recordId);
  const hasIndividualPrints = prints.some(key => value(key));
  const hasStrip = Boolean(value('fingerprints'));
  const renderNotes = (note?: string) => note
    ? <p className={styles.note} dir="auto">{note}</p>
    : <p className={styles.empty}>{tr('No notes recorded.', 'لا توجد ملاحظات مسجلة.')}</p>;
  const groupHeading = (group: Group) => group === 'arrests'
    ? <>
        <h2 className={styles.sectionTitle}>{label('arrests')}</h2>
        <div className={styles.columnHead} role="row">
          {arrestColumns.map(column => <span key={column.key} role="columnheader">{column.label[locale]}</span>)}
        </div>
      </>
    : <h2 className={styles.sectionTitle}>{label('notes')}</h2>;

  const blocks: Block[] = [
    { content:
      <header className={styles.header}>
        <div className={styles.masthead}>
          <BureauSeal />
          <div><h1>{definition.name[locale]}</h1><p>{definition.category[locale]}</p></div>
        </div>
        <div className={styles.fileInfo}>
          <dl>{['reference', 'purpose_code', 'state_id'].map(key => field(key))}</dl>
          <p>{tr('Confidential · For official use only', 'سري · للاستخدام الرسمي فقط')}</p>
        </div>
      </header>,
    },
    { content:
      <section className={styles.identity} aria-label={tr('Identity', 'الهوية')}>
        <div className={styles.identityFields}>
          <dl>
            {field('subject')}
            {field('aliases')}
            {field('record_id', useRecordBoxes ? <>
              <bdi className={styles.visuallyHidden}>{recordId || '—'}</bdi>
              <span className={styles.recordBoxes} dir="ltr" aria-hidden="true">
                {Array.from({ length: 12 }, (_, index) => <span key={index}>{recordCharacters[index]}</span>)}
              </span>
            </> : undefined)}
          </dl>
          <dl className={styles.traits}>{traits.map(key => field(key))}</dl>
          <dl className={styles.birth}>
            {field('birth_date')}{field('age')}{field('tracking_number')}
          </dl>
        </div>
        <figure className={styles.portrait}>
          <div>{image('portrait', tr('Photograph unavailable', 'الصورة غير متوفرة'))}</div>
          <figcaption>{label('portrait')}</figcaption>
        </figure>
      </section>,
    },
    { content: <dl className={styles.address}>{field('address')}{field('check_date')}</dl> },
    ...rows.map(row => ({
      group: 'arrests' as const,
      content: <div className={styles.arrestRow} role="row">
        {arrestColumns.map(column => <span key={column.key} role="cell">
          {column.kind === 'date' && row[column.key]
            ? <time dateTime={row[column.key]} dir="ltr">{row[column.key]}</time>
            : <bdi>{row[column.key] || '—'}</bdi>}
        </span>)}
      </div>,
    })),
    ...(!rows.length ? [{
      group: 'arrests' as const,
      content: <div role="row"><div role="cell" aria-colspan={arrestColumns.length} className={styles.emptyArrests}>
        {tr('No entries on record.', 'لا توجد مدخلات في السجل.')}
      </div></div>,
    }] : []),
    ...(rows.length < 5 ? [{
      group: 'arrests' as const,
      content: <div aria-hidden="true" className={styles.blankRows}>
        {Array.from({ length: 5 - Math.max(rows.length, 1) }, (_, index) => <div key={index} />)}
      </div>,
    }] : []),
    { content:
      <section className={styles.signoff} aria-label={tr('Report sign-off', 'اعتماد التقرير')}>
        <dl>{['transfer_number', 'corrections_number', 'reviewer', 'signed_date'].map(key => field(key))}</dl>
        <div className={styles.validation}>
          <div className={styles.signature}>{value('signature') && image('signature', tr('Signature unavailable', 'التوقيع غير متوفر'))}</div>
          <span>{label('signature')}</span>
          <strong className={styles.stamp}>{tr('Filed', 'مؤرشف')}</strong>
        </div>
      </section>,
    },
    { content:
      <div className={styles.findings}>
        <section>
          <h2 className={styles.sectionTitle}>{tr('Fingerprints', 'البصمات')}</h2>
          {(!hasStrip || hasIndividualPrints) && <div className={styles.printGrid}>
            {prints.map(key => <figure key={key}>
              <div>{image(key, '—')}</div>
              <figcaption>{label(key)}</figcaption>
            </figure>)}
          </div>}
          {hasStrip && <figure className={styles.strip}>
            {image('fingerprints', tr('Prints unavailable', 'البصمات غير متوفرة'))}
          </figure>}
        </section>
        <section className={styles.findingsNotes}>
          <h2 className={styles.sectionTitle}>{label('notes')}</h2>
          {renderNotes(firstNote)}
        </section>
      </div>,
    },
    ...remainingNotes.map(note => ({ group: 'notes' as const, content: renderNotes(note) })),
  ];

  useLayoutEffect(() => {
    const body = measureBody.current;
    const root = measureBlocks.current;
    if (!body || !root) return;
    const measure = () => {
      const elements = Array.from(root.children) as HTMLElement[];
      // Folder previews can start at scale zero. Measure the layout before any viewer transform.
      const heightOf = (element: HTMLElement) => Number.parseFloat(getComputedStyle(element).height);
      const headers = new Map(elements.slice(0, 2).map(element => [element.dataset.group, heightOf(element)]));
      const available = body.clientHeight;
      if (!available) return;
      const next: number[] = [];
      let used = 0;
      let previous: string | undefined;
      elements.slice(2).forEach((element, index) => {
        const group = element.dataset.group;
        const header = headers.get(group) ?? 0;
        const height = heightOf(element);
        const required = height + (group === previous ? 0 : header);
        if (used && used + required > available) {
          next.push(index);
          used = height + header;
        } else used += required;
        previous = group;
      });
      setBreaks(current => current.join() === next.join() ? current : next);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    for (const element of root.children) observer.observe(element);
    return () => observer.disconnect();
  }, [values, locale]);

  const pageStarts = [0, ...breaks].slice(0, pageLimit);
  const pageCount = pageStarts.length;
  const requestedIndex = pageSelection?.index;
  const selectedIndex = requestedIndex === undefined ? undefined : Math.min(requestedIndex, pageCount - 1);
  const stacked = pageSelection && requestedIndex === undefined;
  const onPageCountChange = pageSelection?.onPageCountChange;
  useLayoutEffect(() => { onPageCountChange?.(pageCount); }, [onPageCountChange, pageCount]);

  const renderPage = (start: number, end: number | undefined) => {
    const groups: { group?: Group; items: ReactNode[]; index: number }[] = [];
    blocks.slice(start, end).forEach(({ group, content }, offset) => {
      const previous = groups.at(-1);
      const item = <div className={styles.item} role={group === 'arrests' ? 'presentation' : undefined} key={offset}>{content}</div>;
      if (group && previous?.group === group) previous.items.push(item);
      else groups.push({ group, items: [item], index: offset });
    });
    return groups.map(({ group, items, index }) => group
      ? <section className={styles[group]} key={index} role={group === 'arrests' ? 'table' : undefined} aria-label={label(group)}>
          {groupHeading(group)}{items}
        </section>
      : items[0]);
  };

  return <div className={stacked ? `${styles.report} ${styles.stackedReport}` : styles.report}>
    <div className={styles.measure} aria-hidden="true" inert>
      <div className={styles.frame} ref={measureBody}>
        <div ref={measureBlocks}>
          {(['arrests', 'notes'] as const).map(group => <div key={group} className={styles[group]} data-group={group}>
            {groupHeading(group)}
          </div>)}
          {blocks.map(({ group, content }, index) => <div key={index} className={styles.item} data-group={group}>{content}</div>)}
        </div>
      </div>
    </div>
    {pageStarts.map((start, index) => {
      if (selectedIndex !== undefined && index !== selectedIndex) return null;
      return (
        <article className={styles.page} key={start}>
          {index === 0 && <BureauSeal watermark />}
          {index > 0 && <div className={styles.continuation}>{definition.name[locale]} / <bdi>{value('reference') || value('subject')}</bdi></div>}
          <div className={styles.frame}>{renderPage(start, breaks[index])}</div>
          <footer className={styles.footer}>
            <span>{new Intl.NumberFormat(locale).format(index + 1)}</span>
            <span>{tr('Cat. No.', 'رقم الفهرس')} <bdi>BC-024</bdi></span>
            <span>{tr('Form', 'نموذج')} <bdi>RB 96-01</bdi></span>
          </footer>
        </article>
      );
    })}
  </div>;
}
