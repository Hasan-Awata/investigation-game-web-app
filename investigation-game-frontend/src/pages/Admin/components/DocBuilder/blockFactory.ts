import type { DocBlock, DocBlockType } from '@/types/evidence/doc';
import { nextBlockId } from '@/types/evidence/doc';

/**
 * Default block props for the admin palette.
 *
 * Every entry must satisfy its `DocBlock` variant exactly. The discriminated
 * union is what makes this a compile-time contract: adding a variant to
 * `DocBlock` without giving it a default here fails `tsc` rather than producing
 * a palette button that drops a malformed block onto the canvas.
 *
 * Defaults are deliberately *structurally valid but semantically empty* -- a
 * fresh table has columns but no rows, a fresh list has one blank item. An
 * author who drops a block can immediately see the shape it will take.
 */

/** Starting grid span per type. Anything absent defaults to full width. */
export const DEFAULT_SPANS: Record<DocBlockType, number> = {
  letterhead: 12,
  meta_grid: 12,
  prose: 12,
  two_column: 12,
  table: 12,
  list: 12,
  signature_row: 12,
  stamp: 4,
  barcode: 6,
  watermark: 12,
  rule: 12,
  spacer: 12,
  image: 6,
  annotation: 6,
  redaction: 12,
  diagram: 12,
};

const build = (type: DocBlockType): DocBlock['props'] => {
  switch (type) {
    case 'letterhead':
      return { agency: '', title: '', sub: '', aside: '', asideLabel: '', rule: true };
    case 'meta_grid':
      return {
        rows: [
          { label: '', value: '' },
          { label: '', value: '' },
        ],
        columns: 2,
        tone: 'rows',
      };
    case 'prose':
      return { html: '', tone: 'typed' };
    case 'two_column':
      return { left: [], right: [], gap: 28 };
    case 'table':
      return {
        columns: [
          { key: 'col_1', label: '', align: 'start', type: 'text' },
          { key: 'col_2', label: '', align: 'start', type: 'text' },
        ],
        rows: [],
        tone: 'ledger',
        emptyMessage: '',
      };
    case 'list':
      return { items: [''], ordered: false };
    case 'signature_row':
      return { columns: [{ caption: '' }] };
    case 'stamp':
      return { text: '', tone: 'official' };
    case 'barcode':
      return { value: '' };
    case 'watermark':
      return { text: '', rotate: -30 };
    case 'rule':
      return { variant: 'solid' };
    case 'spacer':
      return { height: 24 };
    case 'image':
      return { url: '', caption: '' };
    case 'annotation':
      return { text: '', rotate: -2 };
    case 'redaction':
      return { lines: 1, label: '' };
    case 'diagram':
      return { preset: 'body_outline', caption: '' };
  }
};

/** Stamps the block's `style` only where the type has a meaningful default. */
const buildStyle = (type: DocBlockType): DocBlock['style'] => {
  if (type === 'stamp') return { align: 'end' };
  return undefined;
};

/**
 * Creates a fresh block of `type` with a unique id.
 *
 * Ids come from `nextBlockId`, which is module-scoped and monotonic, so two
 * blocks dropped in the same millisecond still differ.
 */
export const createBlock = (type: DocBlockType): DocBlock => ({
  id: nextBlockId(),
  type,
  span: DEFAULT_SPANS[type],
  props: build(type),
  style: buildStyle(type),
}) as DocBlock;

/**
 * Deep copy with fresh ids throughout, including `two_column` children.
 *
 * Used by "duplicate block". Shallow-copying would alias nested props arrays
 * (`props.left`, `props.rows`, `props.columns`) back to the original, so editing
 * the copy would silently rewrite the block the author left where it was.
 */
export const cloneBlock = (block: DocBlock): DocBlock => {
  const copy = structuredClone(block) as DocBlock;
  const reid = (b: DocBlock): DocBlock => {
    const next = { ...b, id: nextBlockId() } as DocBlock;
    if (next.type === 'two_column') {
      next.props.left = (next.props.left ?? []).map(reid);
      next.props.right = (next.props.right ?? []).map(reid);
    }
    return next;
  };
  return reid(copy);
};
