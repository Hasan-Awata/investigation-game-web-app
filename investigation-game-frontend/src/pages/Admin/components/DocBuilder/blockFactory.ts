import type { DocBlock, DocBlockType } from '@/types/evidence/doc';
import { nextBlockId } from '@/types/evidence/shared';

/**
 * Default block props for the admin palette.
 *
 * Every entry must satisfy its `DocBlock` variant exactly. The discriminated
 * union is what makes this a compile-time contract: adding a variant to
 * `DocBlock` without giving it a default here fails `tsc` rather than producing
 * a palette button that drops a malformed block onto the canvas.
 */

const DEFAULT_SPANS: Record<DocBlockType, number> = {
  letterhead: 12,
  meta_grid: 12,
  prose: 12,
  two_column: 12,
  table: 12,
  list: 12,
  signature_row: 12,
  stamp: 12,
  barcode: 12,
  watermark: 12,
  rule: 12,
  spacer: 12,
  image: 12,
  annotation: 12,
  redaction: 12,
  diagram: 12,
};

const EMPTY_BLOCK_PROPS: Record<DocBlockType, DocBlock['props']> = {
  letterhead: { agency: '', title: '', sub: '' },
  meta_grid: { rows: [], columns: 2 },
  prose: { html: '', tone: 'typed' },
  two_column: { left: [], right: [], gap: 16 },
  table: { columns: [], rows: [], tone: 'ledger' },
  list: { items: [], ordered: false },
  signature_row: { columns: [{ caption: '' }] },
  stamp: { text: '', tone: 'official' },
  barcode: { value: '' },
  watermark: { text: '', rotate: -15 },
  rule: { variant: 'solid' },
  spacer: { height: 24 },
  image: { url: '', filter: 'plain' },
  annotation: { text: '', rotate: -3 },
  redaction: { lines: 1 },
  diagram: { preset: 'body_outline' },
};

export function createBlock(type: DocBlockType): DocBlock {
  const base = { id: nextBlockId(type.slice(0, 2)), span: DEFAULT_SPANS[type], style: {} };
  const props = { ...EMPTY_BLOCK_PROPS[type] };
  return { ...base, type, props } as DocBlock;
}

export function cloneBlock(block: DocBlock): DocBlock {
  const cloned = structuredClone(block);
  cloned.id = nextBlockId(block.type.slice(0, 2));
  return cloned;
}

export function emptyDoc(): { v: 1; theme: 'case_file'; page: { w: number; minH: number; pad: number }; blocks: DocBlock[] } {
  return { v: 1, theme: 'case_file', page: { w: 800, minH: 1131, pad: 64 }, blocks: [] };
}