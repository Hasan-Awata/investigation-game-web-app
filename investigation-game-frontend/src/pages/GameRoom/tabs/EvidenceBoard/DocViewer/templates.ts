import type {
  DocBlock,
  DocDocument,
  DocTheme,
  MetaRow,
  TableColumn,
  TableRow,
} from '@/types/evidence/doc';
import { DEFAULT_PAGE } from '@/types/evidence/doc';

/**
 * Starter documents for the admin builder.
 *
 * Twelve templates, one per artefact the legacy document/forensic viewers used
 * to special-case, so an author can reproduce a familiar artefact without
 * rebuilding it block by block. Each factory returns a FRESH block tree on
 * every call -- templates are never shared by reference, because the
 * builder mutates blocks in place and a shared template would bleed edits across
 * every new document.
 *
 * Text is deliberately Latin/English placeholder. The game's content is
 * Arabic-first, and hardcoding Arabic strings here would put untranslated copy in
 * the codebase; the Phase 3 builder supplies real localized strings.
 */

let seq = 0;
/** Stable, collision-free id for template-authored blocks. */
const tid = (tag: string): string => {
  seq += 1;
  return `tpl_${tag}_${seq.toString(36)}`;
};

const letterhead = (
  agency: string,
  title: string,
  sub?: string,
  aside?: string,
  asideLabel?: string,
  span = 12,
): DocBlock => ({
  id: tid('lh'),
  type: 'letterhead',
  span,
  props: { agency, title, sub, aside, asideLabel, rule: true },
});

const meta = (
  rows: MetaRow[],
  opts?: { span?: number; columns?: number; tone?: 'rows' | 'boxed' | 'plain' },
): DocBlock => ({
  id: tid('meta'),
  type: 'meta_grid',
  span: opts?.span ?? 12,
  props: { rows, columns: opts?.columns ?? 2, tone: opts?.tone ?? 'rows' },
});

const prose = (html: string, tone?: 'typed' | 'handwritten' | 'mono' | 'serif', span = 12): DocBlock => ({
  id: tid('prose'),
  type: 'prose',
  span,
  props: { html, tone: tone ?? 'typed' },
});

const rule = (span = 12, variant?: 'solid' | 'dashed' | 'dotted' | 'double'): DocBlock => ({
  id: tid('rule'),
  type: 'rule',
  span,
  props: { variant },
});

const spacer = (height: number, span = 12): DocBlock => ({
  id: tid('sp'),
  type: 'spacer',
  span,
  props: { height },
});

const stamp = (text: string, tone?: 'official' | 'forged' | 'confidential' | 'crimson'): DocBlock => ({
  id: tid('st'),
  type: 'stamp',
  span: 4,
  props: { text, tone: tone ?? 'official' },
  style: { align: 'end' },
});

const watermark = (text: string): DocBlock => ({
  id: tid('wm'),
  type: 'watermark',
  span: 12,
  props: { text, rotate: -30 },
});

const table = (
  caption: string | undefined,
  columns: TableColumn[],
  rows: TableRow[],
  opts?: { tone?: 'ledger' | 'log'; span?: number; emptyMessage?: string },
): DocBlock => ({
  id: tid('tbl'),
  type: 'table',
  span: opts?.span ?? 12,
  props: {
    columns,
    rows,
    tone: opts?.tone ?? 'ledger',
    caption,
    emptyMessage: opts?.emptyMessage,
  },
});

const list = (items: string[], ordered = false, span = 12): DocBlock => ({
  id: tid('li'),
  type: 'list',
  span,
  props: { items, ordered },
});

const doc = (theme: DocTheme, blocks: DocBlock[]): DocDocument => ({
  v: 1,
  theme,
  page: { ...DEFAULT_PAGE },
  blocks,
});

export interface DocTemplate {
  key: string;
  label: string;
  build: () => DocDocument;
}

/** Column definitions shared by the itemised-table templates. */
const MONEY: TableColumn[] = [
  { key: 'date', label: 'Date' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount', type: 'number', align: 'end' },
];

const CALL: TableColumn[] = [
  { key: 'date', label: 'Date' },
  { key: 'number', label: 'Number', type: 'mono' },
  { key: 'direction', label: 'Direction', type: 'badge', tones: { incoming: 'in', outgoing: 'out', missed: 'missed' } },
  { key: 'duration', label: 'Duration', type: 'mono', align: 'end' },
];

export const DOC_TEMPLATES: DocTemplate[] = [
  /* ---------- 1. CONTRACT ------------------------------------ */
  {
    key: 'contract',
    label: 'Contract',
    build: () =>
      doc('case_file', [
        watermark('DRAFT'),
        letterhead('Office of Legal Affairs', 'Service Agreement', 'Effective on countersignature', 'DOCKET', 'NO. 4471'),
        meta([
          { label: 'Parties', value: 'A. Vance  /  Meridian Holdings Ltd.' },
          { label: 'Effective', value: '—' },
          { label: 'Jurisdiction', value: '—' },
          { label: 'Governing law', value: '—' },
        ]),
        rule(),
        prose(
          '<p>This Agreement is entered into by and between the parties named above. Each party represents that it has full authority to bind itself to the obligations set out herein.</p><p>Nothing in this Agreement shall be construed to limit either party&rsquo;s statutory rights.</p>',
        ),
        rule(),
        prose('<p>IN WITNESS WHEREOF the parties have executed this Agreement as of the date first written above.</p>', 'serif'),
        { id: tid('sig'), type: 'signature_row', span: 12, props: { columns: [{ caption: 'For the Company' }, { caption: 'Authorised Signatory' }] } } as DocBlock,
        spacer(16),
        stamp('Executed', 'confidential'),
      ]),
  },

  /* ---------- 2. MEMO ---------------------------------------- */
  {
    key: 'memo',
    label: 'Internal Memo',
    build: () =>
      doc('notebook', [
        letterhead('Internal', 'Memo', 'To: Detective Unit 4', 'FILE', 'MEMO'),
        meta([
          { label: 'From', value: '—' },
          { label: 'Date', value: '—' },
          { label: 'Re', value: '—' },
        ], { tone: 'plain', columns: 1 }),
        rule(12, 'dashed'),
        prose('Working notes. Not for distribution outside the unit.', 'handwritten'),
        prose('Follow up on the statement taken Tuesday. Two details do not line up with the timeline we have, and the second location in her account is four blocks from where the witness placed her.</p>'),
        prose('Re-check the call log against the bank ledger. If the transfer cleared after the call, the timeline holds and the account she gave us is a cover. If it cleared before, she was already in debt and the motive is not ours.', 'handwritten'),
        { id: tid('ann'), type: 'annotation', span: 8, props: { text: 'confirm before next interview', rotate: -3 } } as DocBlock,
      ]),
  },

  /* ---------- 3. CORRESPONDENCE ------------------------------ */
  {
    key: 'correspondence',
    label: 'Correspondence',
    build: () =>
      doc('case_file', [
        letterhead('Municipal Records', 'Letter of Correspondence', 'Sent via registered post', 'REF', '—'),
        meta([
          { label: 'From', value: '—' },
          { label: 'To', value: '—' },
          { label: 'Sent', value: '—' },
          { label: 'Received', value: '—' },
        ]),
        rule(),
        prose('<p>Sir or Madam,</p><p>We acknowledge receipt of your enquiry of the date above. The records requested are held in the municipal archive and are available for inspection during business hours.</p><p>You must present identification and a written authority before any copy will be released.</p>'),
        prose('Yours faithfully,'),
        spacer(8),
        { id: tid('sig'), type: 'signature_row', span: 8, props: { columns: [{ caption: 'Records Clerk' }] } } as DocBlock,
      ]),
  },

  /* ---------- 4. FINANCIAL RECORD ---------------------------- */
  {
    key: 'financial_record',
    label: 'Bank Statement',
    build: () =>
      doc('ledger', [
        watermark('COPY'),
        letterhead('Meridian Holdings', 'Account Statement', 'Consolidated, all branches', 'ACCOUNT', '—'),
        meta([
          { label: 'Account holder', value: '—' },
          { label: 'Account no.', value: '—' },
          { label: 'Period', value: '—' },
          { label: 'Currency', value: '—' },
        ], { tone: 'boxed', columns: 2 }),
        table('Statement of activity', MONEY, [], { emptyMessage: 'No activity recorded for this period.' }),
        spacer(12),
        { id: tid('bc'), type: 'barcode', span: 6, props: { value: '0000 0000 0000' } } as DocBlock,
        stamp('Verified', 'confidential'),
      ]),
  },

  /* ---------- 5. PHONE RECORDS ------------------------------- */
  {
    key: 'phone_records',
    label: 'Call Log',
    build: () =>
      doc('ledger', [
        letterhead('Telecommunications', 'Subscriber Call Log', 'Lawful production order', 'LINE', '—'),
        meta([
          { label: 'Subscriber', value: '—' },
          { label: 'Number', value: '—' },
          { label: 'Period', value: '—' },
          { label: 'Produced', value: '—' },
        ], { tone: 'rows', columns: 2 }),
        table(undefined, CALL, [], {
          tone: 'log',
          emptyMessage: 'No calls originated or terminated on this line in the period.',
        }),
        spacer(12),
        { id: tid('bc'), type: 'barcode', span: 6, props: { value: 'TEL 000 0000' } } as DocBlock,
      ]),
  },

  /* ---------- 6. BACKGROUND CHECK ---------------------------- */
  {
    key: 'background_check',
    label: 'Background Check',
    build: () =>
      doc('dossier', [
        letterhead('Records Bureau', 'Background Record', 'Full scope search', 'FILE', '—'),
        meta([
          { label: 'Subject', value: '—' },
          { label: 'DOB', value: '—' },
          { label: 'Search date', value: '—' },
          { label: 'Scope', value: 'County + federal' },
        ], { tone: 'boxed', columns: 2 }),
        prose('<p><strong>Prior addresses</strong></p>', 'mono'),
        prose('<ul><li>Current — verified</li><li>Previous — <span class="redacted">withheld</span></li></ul>', 'mono'),
        prose('<p><strong>Known associates</strong></p>', 'mono'),
        prose(
          '<p>Two entries returned. One is a <span class="redacted">minor</span> conviction; the other is a civil matter settled out of court.</p><p>See the enclosed record for the <span class="highlighted">sealed address history</span>.</p>',
          'mono',
        ),
        { id: tid('rd'), type: 'redaction', span: 12, props: { lines: 3, label: 'Redacted pursuant to order' } } as DocBlock,
        rule(),
        prose('<p>Prepared by an automated records request. No inference of guilt attaches to any entry listed.</p>', 'mono'),
      ]),
  },

  /* ---------- 7. JOURNAL ------------------------------------- */
  {
    key: 'journal',
    label: 'Journal / Diary',
    build: () =>
      doc('notebook', [
        prose('Journal — private', 'handwritten'),
        meta([{ label: 'Entry', value: '—' }], { tone: 'plain', columns: 1 }),
        rule(12, 'dotted'),
        prose('Woke before the alarm again. The thing I cannot shake is not the argument but the quiet after it — how fast the room went back to normal, as though nothing had been said at all.', 'handwritten'),
        prose('Wrote the names down in order. Cross-checked two of them against the register. The second one is misspelled on the form, which is the only reason I found it.', 'handwritten'),
        spacer(20),
        prose('— signed, and dated in the margin', 'handwritten'),
        { id: tid('sig'), type: 'signature_row', span: 6, props: { columns: [{ caption: 'Author' }] } } as DocBlock,
      ]),
  },

  /* ---------- 8. AUTOPSY ------------------------------------- */
  {
    key: 'autopsy',
    label: 'Autopsy Report',
    build: () =>
      doc('lab', [
        letterhead('Forensic Pathology', 'Autopsy Report', 'Office of the Chief Medical Examiner', 'CASE', '—'),
        meta([
          { label: 'Case', value: '—' },
          { label: 'Decedent', value: '—' },
          { label: 'Exam date', value: '—' },
          { label: 'Examiner', value: '—' },
        ], { tone: 'boxed', columns: 4 }),
        {
          id: tid('2c'),
          type: 'two_column',
          span: 12,
          props: {
            gap: 28,
            rightWidth: 170,
            left: [
              table('Findings', [
                { key: 'finding', label: 'Finding' },
                { key: 'note', label: 'Note' },
              ], [], { emptyMessage: 'No external findings recorded.' }),
            ],
            right: [
              {
                id: tid('dg'),
                type: 'diagram',
                span: 12,
                props: { preset: 'body_outline', caption: 'Reference diagram' },
              } as DocBlock,
            ],
          },
        } as DocBlock,
        rule(),
        prose('<p><strong>Cause of death</strong></p>', 'mono'),
        prose('<p>Pending. See supplemental toxicology.</p>', 'mono'),
        spacer(12),
        { id: tid('sig'), type: 'signature_row', span: 12, props: { columns: [{ caption: 'Chief Medical Examiner' }] } } as DocBlock,
      ]),
  },

  /* ---------- 9. BALLISTICS ---------------------------------- */
  {
    key: 'ballistics',
    label: 'Ballistics Report',
    build: () =>
      doc('lab', [
        letterhead('Firearms & Ballistics', 'Ballistics Examination', 'NIBIN / AFTE comparison', 'REPORT', '—'),
        meta([
          { label: 'Evidence', value: '—' },
          { label: 'Examiner', value: '—' },
          { label: 'Received', value: '—' },
        ], { tone: 'boxed', columns: 3 }),
        table('Microscopic comparison', [
          { key: 'land', label: 'Land impression' },
          { key: 'quantity', label: 'Quantity' },
          { key: 'dimensions', label: 'Dimensions' },
          { key: 'conclusion', label: 'Conclusion' },
        ], [], { emptyMessage: 'No comparison performed on this item.' }),
        spacer(16),
        prose('<p>Examiner&rsquo;s opinion is recorded above. Items not suitable for comparison are documented with the reason.</p>', 'mono'),
        { id: tid('ann'), type: 'annotation', span: 6, props: { text: 'ask about the second firing', rotate: -2 } } as DocBlock,
        spacer(8),
        { id: tid('sig'), type: 'signature_row', span: 12, props: { columns: [{ caption: 'Examiner' }] } } as DocBlock,
      ]),
  },

  /* ---------- 10. DNA ---------------------------------------- */
  {
    key: 'dna',
    label: 'DNA / STR Analysis',
    build: () =>
      doc('lab', [
        letterhead('Genetic Laboratory', 'STR Analysis Report', 'Combined DNA Index System', 'SAMPLE', '—'),
        meta([
          { label: 'Evidence', value: '—' },
          { label: 'Sample type', value: '—' },
          { label: 'Analyst', value: '—' },
        ], { tone: 'boxed', columns: 3 }),
        {
          id: tid('dg'),
          type: 'diagram',
          span: 12,
          props: { preset: 'electropherogram', caption: 'Crime scene sample vs. database record' },
        } as DocBlock,
        rule(),
        table('Results', [
          { key: 'result', label: 'Result' },
          { key: 'value', label: 'Value' },
        ], [
          { result: 'Probability of match', value: '—' },
          { result: 'Identified subject', value: 'No match' },
        ]),
        prose('<p>Conclusions are reported for investigative use only and are not a substitute for a legal determination of identity.</p>', 'mono'),
        { id: tid('bc'), type: 'barcode', span: 6, props: { value: 'CODIS 0000' } } as DocBlock,
      ]),
  },

  /* ---------- 11. TRACE ANALYSIS ----------------------------- */
  {
    key: 'trace_analysis',
    label: 'Trace / Mass Spec',
    build: () =>
      doc('lab', [
        letterhead('Advanced Laboratory', 'Trace Analysis', 'Mass spectrometry screening', 'SAMPLE', '—'),
        meta([
          { label: 'Sample', value: '—' },
          { label: 'Scan date', value: '—' },
          { label: 'Instrument', value: '—' },
        ], { tone: 'boxed', columns: 3 }),
        {
          id: tid('dg'),
          type: 'diagram',
          span: 12,
          props: { preset: 'mass_spec', caption: 'Reference spectrum vs. library match' },
        } as DocBlock,
        rule(),
        meta([
          { label: 'Material', value: '—' },
          { label: 'Origin', value: '—' },
        ], { tone: 'rows', columns: 2 }),
        prose('<p>Analysis complete. Origin is stated at the confidence level recorded above; higher confidence tiers require a confirmatory run.</p>', 'mono'),
        stamp('Complete', 'official'),
      ]),
  },

  /* ---------- 12. DIGITAL FORENSICS -------------------------- */
  {
    key: 'digital_forensics',
    label: 'Digital Forensics',
    build: () =>
      doc('dossier', [
        letterhead('Digital Forensics Unit', 'Device Examination', 'Logical extraction report', 'DEVICE', '—'),
        meta([
          { label: 'Exhibit', value: '—' },
          { label: 'Device', value: '—' },
          { label: 'Acquired', value: '—' },
          { label: 'Examiner', value: '—' },
        ], { tone: 'boxed', columns: 4 }),
        prose('<p><strong>Extraction summary</strong></p>', 'mono'),
        list([
          'Logical extraction completed; image verified against acquisition hash.',
          'Deleted artefacts recovered from unallocated space.',
          'Application data isolated; passcode not defeated during this examination.',
        ], true),
        rule(),
        prose('<p>Artifacts are presented in acquisition order. Interpretation of individual artefacts is deferred to the examining analyst.</p>', 'mono'),
        spacer(12),
        { id: tid('sig'), type: 'signature_row', span: 12, props: { columns: [{ caption: 'Examiner' }] } } as DocBlock,
      ]),
  },
];

export const getTemplate = (key: string): DocTemplate | undefined =>
  DOC_TEMPLATES.find((t) => t.key === key);

/** Reset for tests and the Phase 3 builder's "new document" flow. */
export const resetTemplateSeq = (): void => {
  seq = 0;
};
