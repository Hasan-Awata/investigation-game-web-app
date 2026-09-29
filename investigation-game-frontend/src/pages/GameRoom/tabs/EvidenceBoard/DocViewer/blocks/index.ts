import type { DocBlock, DocRenderContext } from '@/types/evidence/doc';
import type { FC } from 'react';

import LetterheadBlock from './LetterheadBlock';
import MetaGridBlock from './MetaGridBlock';
import ProseBlock from './ProseBlock';
import TwoColumnBlock from './TwoColumnBlock';
import TableBlock from './TableBlock';
import ListBlock from './ListBlock';
import SignatureRowBlock from './SignatureRowBlock';
import StampBlock from './StampBlock';
import BarcodeBlock from './BarcodeBlock';
import WatermarkBlock from './WatermarkBlock';
import RuleBlock from './RuleBlock';
import SpacerBlock from './SpacerBlock';
import ImageBlock from './ImageBlock';
import AnnotationBlock from './AnnotationBlock';
import RedactionBlock from './RedactionBlock';
import DiagramBlock from './DiagramBlock';

/**
 * Maps a block `type` to its component, keyed so that adding a variant to
 * `DocBlock` without registering it here is a compile error. Mirrors the legacy
 * `DocumentRegistryMap` pattern in Viewers/DocumentViewer.tsx:16-20.
 */
export type BlockComponentMap = {
  [K in DocBlock['type']]: FC<{
    block: Extract<DocBlock, { type: K }>;
    ctx: DocRenderContext;
  }>;
};

export const BLOCK_REGISTRY: BlockComponentMap = {
  letterhead: LetterheadBlock,
  meta_grid: MetaGridBlock,
  prose: ProseBlock,
  two_column: TwoColumnBlock,
  table: TableBlock,
  list: ListBlock,
  signature_row: SignatureRowBlock,
  stamp: StampBlock,
  barcode: BarcodeBlock,
  watermark: WatermarkBlock,
  rule: RuleBlock,
  spacer: SpacerBlock,
  image: ImageBlock,
  annotation: AnnotationBlock,
  redaction: RedactionBlock,
  diagram: DiagramBlock,
};

/** Narrowing is impossible through a union-keyed lookup, so this cast is the seam. */
export type AnyBlockComponent = FC<{ block: DocBlock; ctx: DocRenderContext }>;

export const getBlockComponent = (type: DocBlock['type']): AnyBlockComponent =>
  BLOCK_REGISTRY[type] as unknown as AnyBlockComponent;
