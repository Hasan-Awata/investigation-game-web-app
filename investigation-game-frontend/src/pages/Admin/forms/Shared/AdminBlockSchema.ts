import type {
  BlockFieldInput,
  BlockSchema,
  DraftEvidenceBlock,
  EvidenceBlockType,
} from '@/types/evidence';

/**
 * Client-side helpers for the server-served block catalog.
 *
 * The previous version of this file hard-coded a field list per block, which
 * made it a second copy of BlockCatalog that drifted silently. Nothing is
 * declared here except the behaviour of each control: the field names, labels,
 * defaults and option lists all arrive from GET /api/admin/evidence-schema.
 */

export type { BlockFieldInput, BlockSchema };

/** A prop bag the editor can edit before it is known to satisfy its block type. */
export type DraftBlockProps = Record<string, unknown>;

/** The value a fresh control should start at, given its input kind. */
function neutralValueFor(input: BlockFieldInput, declared?: unknown): unknown {
  // An explicit default from the server always wins, including `false` and `0`,
  // which a truthiness check would silently discard.
  if (declared !== undefined) {
    return declared;
  }

  switch (input) {
    case 'rich_text':
    case 'textarea':
    case 'text':
      return '';
    case 'toggle':
      return false;
    case 'number':
      return 0;
    case 'string_row':
    case 'string_grid':
      return [];
    default:
      return null;
  }
}

/**
 * Builds a new block of the given type, seeded entirely from the server's
 * declared defaults.
 */
export function createBlockFromSchema(schema: BlockSchema, type: EvidenceBlockType): DraftEvidenceBlock {
  const props: DraftBlockProps = {};

  for (const field of schema.fields) {
    props[field.name] = neutralValueFor(field.input, field.default);
  }

  return { id: crypto.randomUUID(), type, props };
}

/** Looks up a block's descriptor in the served catalog. */
export function findBlockSchema(
  blocks: BlockSchema[],
  type: EvidenceBlockType
): BlockSchema | undefined {
  return blocks.find((block) => block.type === type);
}

/**
 * The value a control should show for a prop that may be absent.
 *
 * A stored block can be missing a prop the catalog has since gained a default
 * for, so the control falls back to the declared default rather than rendering
 * an empty input that would silently blank the value on the next save.
 */
export function readFieldValue(
  props: DraftBlockProps,
  schema: BlockSchema,
  fieldName: string
): unknown {
  const stored = props[fieldName];

  if (stored !== undefined) {
    return stored;
  }

  const field = schema.fields.find((candidate) => candidate.name === fieldName);

  return field ? neutralValueFor(field.input, field.default) : undefined;
}

/** Casts an edited control value to the prop type its block declares. */
export function coerceFieldValue(
  input: BlockFieldInput,
  value: unknown
): DraftBlockProps[string] {
  switch (input) {
    case 'toggle':
      return typeof value === 'boolean' ? value : Boolean(value);

    case 'number': {
      const parsed = typeof value === 'number' ? value : Number(value);
      // NaN would serialize to null and fail server validation with a message
      // that points at the wrong field, so an unparseable entry becomes 0.
      return Number.isFinite(parsed) ? parsed : 0;
    }

    case 'string_row':
      return Array.isArray(value) ? value.map((entry) => String(entry)) : [];

    case 'string_grid':
      return Array.isArray(value)
        ? value.map((row) => (Array.isArray(row) ? row.map((entry) => String(entry)) : []))
        : [];

    case 'signature': {
      const parsed = typeof value === 'number' ? value : Number(value);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }

    case 'select':
      return typeof value === 'string' ? value : '';

    default:
      return typeof value === 'string' ? value : '';
  }
}

/**
 * Reports the fields a block is still missing, using the server's own
 * `required` flags, so the author sees the same requirement the write path will
 * enforce rather than a client approximation of it.
 */
export function findMissingRequiredFields(
  schema: BlockSchema,
  props: DraftBlockProps
): string[] {
  return schema.fields
    .filter((field) => field.required)
    .filter((field) => {
      const value = readFieldValue(props, schema, field.name);

      if (Array.isArray(value)) {
        return value.length === 0;
      }

      if (typeof value === 'string') {
        return value.trim() === '';
      }

      return value === null || value === undefined;
    })
    .map((field) => field.label);
}
