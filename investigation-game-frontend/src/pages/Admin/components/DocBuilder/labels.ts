import type { DocBlockType, DocTheme } from '@/types/evidence/doc';
import { DOC_BLOCK_TYPES, DOC_THEMES } from '@/types/evidence/doc';

/**
 * English fallbacks for the builder chrome.
 *
 * Every label here is also wired into `translationAdmin` under
 * `forms.docBuilder`. These maps are the fallback path only: the builder reads
 * `adminT.forms.docBuilder.blocks[type]` first and drops to these when a key is
 * absent, which is how the admin already handles partially-translated trees
 * (see EvidenceMetadataFields). Keeping the fallbacks in one file means an
 * untranslated key degrades to something readable instead of `undefined`.
 */
export const BLOCK_LABELS: Record<DocBlockType, string> = {
  letterhead: 'Letterhead',
  meta_grid: 'Field grid',
  prose: 'Prose',
  two_column: 'Two columns',
  table: 'Table',
  list: 'List',
  signature_row: 'Signature row',
  stamp: 'Stamp',
  barcode: 'Barcode',
  watermark: 'Watermark',
  rule: 'Divider',
  spacer: 'Spacer',
  image: 'Image',
  annotation: 'Annotation',
  redaction: 'Redaction',
  diagram: 'Diagram',
};

export const THEME_LABELS: Record<DocTheme, string> = {
  case_file: 'Case file',
  notebook: 'Notebook',
  ledger: 'Ledger',
  dossier: 'Dossier',
  lab: 'Lab report',
};

/** Ordered lists, matching `DOC_BLOCK_TYPES`, so palette order is stable. */
export const PALETTE_ORDER: readonly DocBlockType[] = DOC_BLOCK_TYPES;
export const THEME_ORDER: readonly DocTheme[] = DOC_THEMES;

/** Glyph shown on each palette button. Decorative only; the label carries meaning. */
export const BLOCK_GLYPHS: Record<DocBlockType, string> = {
  letterhead: '▤',
  meta_grid: '▦',
  prose: '¶',
  two_column: '▥',
  table: '▦',
  list: '•',
  signature_row: '✎',
  stamp: '◉',
  barcode: '|||',
  watermark: '◐',
  rule: '—',
  spacer: '↕',
  image: '▣',
  annotation: '✎',
  redaction: '█',
  diagram: '◌',
};

/** Tone/preset/variant options, exposed to the inspector as select inputs. */
export const PROSE_TONES = ['typed', 'handwritten', 'mono', 'serif'] as const;
export const META_TONES = ['rows', 'boxed', 'plain'] as const;
export const TABLE_TONES = ['ledger', 'log'] as const;
export const IMAGE_FILTERS = ['polaroid', 'mugshot', 'micrograph', 'plain'] as const;
export const STAMP_TONES = ['official', 'forged', 'confidential', 'crimson'] as const;
export const RULE_VARIANTS = ['solid', 'dashed', 'dotted', 'double'] as const;
export const DIAGRAM_PRESETS = ['body_outline', 'fingerprint', 'electropherogram', 'mass_spec'] as const;
export const CELL_TYPES = ['text', 'number', 'mono', 'badge'] as const;
export const ALIGNMENTS = ['start', 'center', 'end'] as const;
