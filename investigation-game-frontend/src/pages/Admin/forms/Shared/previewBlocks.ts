import {
  EvidenceBlockType,
  type BlockSchema,
  type DraftEvidenceBlock,
  type DraftEvidencePage,
  type EvidenceBlock,
  type EvidencePage,
} from '@/types/evidence';
import { readFieldValue } from './AdminBlockSchema';

/**
 * Turns authored draft blocks into validated blocks a viewer can render.
 *
 * A block being authored is a `DraftEvidenceBlock` whose props are
 * `Record<string, unknown>` and may still be empty, while the viewers accept a
 * validated `EvidenceBlock`. The alternative was loosening the viewers to
 * tolerate half-filled input, which would weaken the guarantee the room detail
 * route relies on. So the gap is closed here instead, and only here: every
 * draft block is coerced into the exact prop shape its block type declares, with
 * neutral stand-ins for whatever the author has not filled in yet.
 *
 * Kept free of React so it can be exercised directly.
 */

const TEXT_ALIGNS = ['left', 'center', 'right', 'justify'] as const;
const TEXT_SIZES = ['small', 'body', 'lead', 'heading'] as const;
const STAMP_VARIANTS = ['red', 'blue', 'black'] as const;
const STAMP_FONT_SIZES = ['auto', 'small', 'medium', 'large'] as const;

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function stringOrEmpty(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';

  return String(value);
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(stringOrEmpty) : [];
}

function stringGrid(value: unknown): string[][] {
  return Array.isArray(value) ? value.map(stringList) : [];
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Fills a draft block's props out to the shape its block type declares.
 *
 * Values the author supplied are kept (after coercion, so a field that briefly
 * holds a number does not reach a widget expecting a string); anything missing
 * or out of range gets a neutral stand-in that renders as an empty document
 * rather than throwing.
 */
export function coerceBlockProps(block: DraftEvidenceBlock, schema: BlockSchema | undefined): EvidenceBlock {
  const props = block.props ?? {};
  const field = (name: string) => (schema ? readFieldValue(props, schema, name) : props[name]);

  switch (block.type) {
    case EvidenceBlockType.Text:
      return {
        id: block.id,
        type: EvidenceBlockType.Text,
        props: {
          html: stringOrEmpty(field('html')),
          align: oneOf(field('align'), TEXT_ALIGNS, 'left'),
          size: oneOf(field('size'), TEXT_SIZES, 'body'),
        },
      };

    case EvidenceBlockType.Table:
      return {
        id: block.id,
        type: EvidenceBlockType.Table,
        props: {
          headers: stringList(field('headers')),
          rows: stringGrid(field('rows')),
          caption: stringOrEmpty(field('caption')),
          dense: Boolean(field('dense')),
        },
      };

    case EvidenceBlockType.Signature: {
      const signatureId = Math.trunc(finiteNumber(field('signature_id'), 0));

      return {
        id: block.id,
        type: EvidenceBlockType.Signature,
        props: {
          // 0 matches no catalog entry, so the pad renders its MISSING state
          // rather than an arbitrary signature the author did not pick.
          signature_id: signatureId > 0 ? signatureId : 0,
          label: stringOrEmpty(field('label')),
          verified: Boolean(field('verified')),
        },
      };
    }

    case EvidenceBlockType.Stamp:
      return {
        id: block.id,
        type: EvidenceBlockType.Stamp,
        props: {
          text: stringOrEmpty(field('text')),
          variant: oneOf(field('variant'), STAMP_VARIANTS, 'red'),
          rotation: finiteNumber(field('rotation'), 0),
          font_size: oneOf(field('font_size'), STAMP_FONT_SIZES, 'auto'),
        },
      };

    default:
      // The editor only creates the four catalogued types, so this is
      // unreachable in practice. An empty text block is the least surprising
      // thing to show for an unrecognised type, and it satisfies the union.
      return {
        id: block.id,
        type: EvidenceBlockType.Text,
        props: { html: '', align: 'left', size: 'body' },
      };
  }
}

export function coercePages(pages: DraftEvidencePage[], blocks: BlockSchema[]): EvidencePage[] {
  return pages.map((page, index) => ({
    id: page.id || `page-${index + 1}`,
    blocks: (page.blocks ?? []).map((block) =>
      coerceBlockProps(block, blocks.find((candidate) => candidate.type === block.type))
    ),
  }));
}
