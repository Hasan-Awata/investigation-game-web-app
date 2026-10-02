/**
 * Universal document block model.
 *
 * An evidence record of type `document` or `forensic` carries an opaque `doc`
 * envelope inside its `metadata` JSON column. This file is the single source of
 * truth for that envelope's shape.
 *
 * Versioning: `DocDocument.v` is currently pinned to 1. Bump it whenever a block
 * type is renamed or its props become incompatible, and migrate stored documents
 * at read time. Never mutate stored documents in place.
 *
 * See PlansEvidence.md section 4 for the full rationale.
 */

import type {
  BlockAlign,
  BlockStyle,
  BlockBase,
  BlockRenderContext,
  SpacerProps,
  SpacerBlock,
} from './shared';
import { clampSpan, nextBlockId } from './shared';

/* ------------------------------------------------------------------ *
 * Themes
 * ------------------------------------------------------------------ */

/**
 * Exactly five themes. Board-card skins are derived 1:1 from this list via
 * `DOC_THEME_SKINS`, so adding a theme means adding a skin (see PlansEvidence.md
 * section 3.2). Per-document looks that do not warrant their own card skin
 * (the contract's legal styling, the memo's sticky note) are expressed as block
 * props instead.
 */
export type DocTheme = 'case_file' | 'notebook' | 'ledger' | 'dossier' | 'lab';

export const DOC_THEMES: readonly DocTheme[] = [
  'case_file',
  'notebook',
  'ledger',
  'dossier',
  'lab',
] as const;

/* ------------------------------------------------------------------ *
 * Shared primitives (re-exported from shared.ts)
 * ------------------------------------------------------------------ */

export type { BlockAlign, BlockStyle, BlockBase, BlockRenderContext, SpacerProps, SpacerBlock };
export { clampSpan, nextBlockId };

export interface DocPage {
  w: number;
  minH: number;
  pad: number;
}

export type DocBlockStyle = BlockStyle;

export type DocBlockBase = BlockBase;

export type DocRenderContext = BlockRenderContext;

export interface MetaRow {
  label: string;
  value: string;
}

export interface TableColumn {
  key: string;
  label: string;
  align?: BlockAlign;
  type?: 'text' | 'number' | 'mono' | 'badge';
  tones?: Record<string, string>;
}

export type TableRow = Record<string, string | number>;

export interface SignatureColumn {
  caption: string;
}

export type ProseTone = 'typed' | 'handwritten' | 'mono' | 'serif';
export type MetaGridTone = 'rows' | 'boxed' | 'plain';
export type TableTone = 'ledger' | 'log';
export type ImageFilter = 'polaroid' | 'mugshot' | 'micrograph' | 'plain';
export type StampTone = 'official' | 'forged' | 'confidential' | 'crimson';
export type RuleVariant = 'solid' | 'dashed' | 'dotted' | 'double';

/**
 * Whitelisted inline SVG diagrams. No arbitrary author-supplied SVG.
 *
 * `body_outline` and `fingerprint` are static; `electropherogram` and
 * `mass_spec` are procedurally seeded from `DocRenderContext.evidenceId`, which
 * is how the legacy viewers produced a stable-but-unique chart per evidence row
 * (DnaViewer.tsx:16-27, TraceAnalysisViewer.tsx:18-27).
 */
export type DiagramPreset = 'body_outline' | 'fingerprint' | 'electropherogram' | 'mass_spec';

/* ------------------------------------------------------------------ *
 * Block props
 * ------------------------------------------------------------------ */

export interface LetterheadProps {
  agency?: string;
  title?: string;
  sub?: string;
  aside?: string;
  asideLabel?: string;
  rule?: boolean;
}

export interface MetaGridProps {
  rows: MetaRow[];
  columns?: number;
  tone?: MetaGridTone;
}

export interface ProseProps {
  html: string;
  tone?: ProseTone;
}

export interface TwoColumnProps {
  left: DocBlock[];
  right: DocBlock[];
  gap?: number;
  rightWidth?: number;
}

export interface TableBlockProps {
  columns: TableColumn[];
  rows: TableRow[];
  tone?: TableTone;
  caption?: string;
  emptyMessage?: string;
}

export interface ListProps {
  items: string[];
  ordered?: boolean;
}

export interface SignatureRowProps {
  columns: SignatureColumn[];
}

export interface StampProps {
  text: string;
  tone?: StampTone;
}

export interface BarcodeProps {
  value: string;
}

export interface WatermarkProps {
  text: string;
  rotate?: number;
}

export interface RuleProps {
  variant?: RuleVariant;
}

export interface ImageBlockProps {
  url: string;
  caption?: string;
  width?: number;
  rotate?: number;
  filter?: ImageFilter;
}

export interface AnnotationProps {
  text: string;
  rotate?: number;
}

export interface RedactionProps {
  lines?: number;
  label?: string;
}

export interface DiagramProps {
  preset: DiagramPreset;
  caption?: string;
}

/* ------------------------------------------------------------------ *
 * The block union
 * ------------------------------------------------------------------ */

export type PaperBlock =
  | (DocBlockBase & { type: 'letterhead'; props: LetterheadProps })
  | (DocBlockBase & { type: 'meta_grid'; props: MetaGridProps })
  | (DocBlockBase & { type: 'prose'; props: ProseProps })
  | (DocBlockBase & { type: 'two_column'; props: TwoColumnProps })
  | (DocBlockBase & { type: 'table'; props: TableBlockProps })
  | (DocBlockBase & { type: 'list'; props: ListProps })
  | (DocBlockBase & { type: 'signature_row'; props: SignatureRowProps })
  | (DocBlockBase & { type: 'stamp'; props: StampProps })
  | (DocBlockBase & { type: 'barcode'; props: BarcodeProps })
  | (DocBlockBase & { type: 'watermark'; props: WatermarkProps })
  | (DocBlockBase & { type: 'rule'; props: RuleProps })
  | (DocBlockBase & { type: 'image'; props: ImageBlockProps })
  | (DocBlockBase & { type: 'annotation'; props: AnnotationProps })
  | (DocBlockBase & { type: 'redaction'; props: RedactionProps })
  | (DocBlockBase & { type: 'diagram'; props: DiagramProps });

export type DocBlock = PaperBlock | SpacerBlock;

export type DocBlockType = DocBlock['type'];

export const DOC_BLOCK_TYPES: readonly DocBlockType[] = [
  'letterhead',
  'meta_grid',
  'prose',
  'two_column',
  'table',
  'list',
  'signature_row',
  'stamp',
  'barcode',
  'watermark',
  'rule',
  'spacer',
  'image',
  'annotation',
  'redaction',
  'diagram',
] as const;

/**
 * Blocks that render into the sheet's absolutely-positioned overlay layer
 * instead of the in-flow grid. Extracted by the viewer so they can sit behind
 * (or in front of) all flow content. See PlansEvidence.md section 5.1.
 */
export const DOC_OVERLAY_BLOCK_TYPES: readonly DocBlockType[] = ['watermark'] as const;

/* ------------------------------------------------------------------ *
 * The document envelope
 * ------------------------------------------------------------------ */

export interface DocDocument {
  v: 1;
  theme: DocTheme;
  page: DocPage;
  blocks: DocBlock[];
}

/** Stored under `metadata.doc`. */
export interface DocMetadata {
  doc?: DocDocument;
}

export const DEFAULT_PAGE: DocPage = { w: 800, minH: 1131, pad: 64 };

export const DEFAULT_DOC: DocDocument = {
  v: 1,
  theme: 'case_file',
  page: { ...DEFAULT_PAGE },
  blocks: [],
};

/**
 * Board-card skin per theme, 1:1 with `DOC_THEMES`. Replaces the old
 * `sub_type`-driven card dispatch. See PlansEvidence.md section 3.2.
 */
export const DOC_THEME_SKINS: Record<DocTheme, string> = {
  case_file: 'official',
  notebook: 'handwritten',
  ledger: 'tabular',
  dossier: 'dossier',
  lab: 'report',
};

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/**
 * Narrow an unknown `metadata` payload to a usable `DocDocument`, repairing
 * anything missing or malformed. Never throws — a corrupt document must still
 * render a sheet rather than blanking the viewer.
 */
export const normalizeDoc = (metadata: unknown): DocDocument => {
  const raw = (metadata as DocMetadata | null | undefined)?.doc;
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_DOC, page: { ...DEFAULT_PAGE }, blocks: [] };
  }

  const theme: DocTheme = DOC_THEMES.includes(raw.theme) ? raw.theme : 'case_file';
  const page: DocPage = {
    w: Number.isFinite(raw.page?.w) && raw.page!.w > 0 ? raw.page!.w : DEFAULT_PAGE.w,
    minH: Number.isFinite(raw.page?.minH) && raw.page!.minH > 0 ? raw.page!.minH : DEFAULT_PAGE.minH,
    pad: Number.isFinite(raw.page?.pad) ? raw.page!.pad : DEFAULT_PAGE.pad,
  };

  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks.filter((b: unknown): b is DocBlock => !!b && typeof b === 'object' && 'type' in b)
    : [];

  return { v: 1, theme, page, blocks };
};

/**
 * Recursively stamps a guaranteed-unique `id` onto any block tree that lacks
 * one. Used when loading a document so `key` is never undefined.
 */
export const ensureBlockIds = (blocks: DocBlock[]): DocBlock[] =>
  blocks.map((b) => {
    const withId = b.id ? b : ({ ...b, id: nextBlockId() } as DocBlock);
    if (withId.type === 'two_column') {
      return {
        ...withId,
        props: {
          ...withId.props,
          left: ensureBlockIds(withId.props.left ?? []),
          right: ensureBlockIds(withId.props.right ?? []),
        },
      } as DocBlock;
    }
    return withId;
  });

/* ------------------------------------------------------------------ *
 * Templates (imported from viewer to keep single source of truth)
 * ------------------------------------------------------------------ */

export type TemplateName =
  | 'correspondence'
  | 'financial_record'
  | 'journal'
  | 'contract'
  | 'memo'
  | 'background_check'
  | 'phone_records'
  | 'autopsy'
  | 'ballistics'
  | 'dna'
  | 'digital_forensics'
  | 'trace_analysis';