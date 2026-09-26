/**
 * The unified evidence contract.
 *
 * Everything here mirrors the backend, which is the single authority:
 *   - app/Enums/*                    the value enums
 *   - app/Services/Evidence/BlockCatalog.php   the block prop schemas
 *   - app/Http/Resources/EvidenceBoardResource.php
 *   - app/Http/Resources/EvidenceDetailResource.php
 *
 * The previous model let a single `Evidence` interface carry every widget and
 * an optional `theme`, so any component could read `evidence.pages` off a
 * photograph. The union below makes that unrepresentable: an evidence's
 * `viewer_strategy` decides which payload shape it can possibly have, and the
 * compiler rejects the mismatched combinations that the server answers with a
 * 422.
 *
 * Values are declared as `as const` objects rather than TypeScript `enum`s
 * because this project compiles with `erasableSyntaxOnly`, which forbids
 * constructs that emit runtime code.
 */

// ---------------------------------------------------------------------------
// Value enums
// ---------------------------------------------------------------------------

export const EvidenceType = {
  Document: 'document',
  Forensic: 'forensic',
  Ballistics: 'ballistics',
  Testimony: 'testimony',
  Digital: 'digital',
  Image: 'image',
  Audio: 'audio',
  Custom: 'custom',
} as const;

export type EvidenceType = (typeof EvidenceType)[keyof typeof EvidenceType];

export const ViewerStrategy = {
  Paper: 'paper',
  Terminal: 'terminal',
  Media: 'media',
  Artifact: 'artifact',
} as const;

export type ViewerStrategy = (typeof ViewerStrategy)[keyof typeof ViewerStrategy];

/** The strategies whose payload is a list of authored pages. */
export type PagedViewerStrategy =
  | typeof ViewerStrategy.Paper
  | typeof ViewerStrategy.Terminal;

export const PaperFinish = {
  Blank: 'blank',
  Manila: 'manila',
} as const;

export type PaperFinish = (typeof PaperFinish)[keyof typeof PaperFinish];

export const EvidenceBlockType = {
  Text: 'text',
  Table: 'table',
  Signature: 'signature',
  Stamp: 'stamp',
} as const;

export type EvidenceBlockType =
  (typeof EvidenceBlockType)[keyof typeof EvidenceBlockType];

export const AssetKind = {
  Image: 'image',
  Audio: 'audio',
  Model3d: 'model_3d',
} as const;

export type AssetKind = (typeof AssetKind)[keyof typeof AssetKind];

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/**
 * Block props, discriminated by block type.
 *
 * These mirror the `fields` in BlockCatalog, including each field's `options`
 * and bounds. Every block is legal on every evidence type: the backend states
 * that presentation is the only thing that varies per type, so there is no
 * per-type compatibility matrix to reproduce here.
 */
export type TextBlockProps = {
  html: string;
  align: 'left' | 'center' | 'right' | 'justify';
  size: 'small' | 'body' | 'lead' | 'heading';
};

export type TableBlockProps = {
  headers: string[];
  rows: string[][];
  caption: string;
  dense: boolean;
};

export type SignatureBlockProps = {
  signature_id: number;
  label: string;
  verified: boolean;
};

export type StampBlockProps = {
  text: string;
  variant: 'red' | 'blue' | 'black';
  rotation: number;
  font_size: 'auto' | 'small' | 'medium' | 'large';
};

export type EvidenceBlock = {
  [T in EvidenceBlockType]: {
    id: string;
    type: T;
    props: BlockPropsFor[T];
  };
}[EvidenceBlockType];

export type BlockPropsFor = {
  [EvidenceBlockType.Text]: TextBlockProps;
  [EvidenceBlockType.Table]: TableBlockProps;
  [EvidenceBlockType.Signature]: SignatureBlockProps;
  [EvidenceBlockType.Stamp]: StampBlockProps;
};

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

export interface EvidencePage {
  id: string;
  blocks: EvidenceBlock[];
}

/**
 * A block while it is still being authored.
 *
 * The discriminated `EvidenceBlock` union is what the server guarantees once a
 * document is stored. Mid-edit, a block's props are still partial and may not
 * satisfy their declared type yet, so the editor works with this looser shape
 * and the union is only relied on at the storage boundary.
 */
export type DraftEvidenceBlock = {
  id: string;
  type: EvidenceBlockType;
  props: Record<string, unknown>;
};

export interface DraftEvidencePage {
  id: string;
  blocks: DraftEvidenceBlock[];
}

export interface DraftPagedPayload {
  pages: DraftEvidencePage[];
}

/** The payload for the `paper` and `terminal` strategies. */
export interface PagedContentPayload {
  pages: EvidencePage[];
}

export interface HtmlArtifactPayload {
  kind: 'html';
  html: string;
  css: string;
}

export interface Model3dArtifactPayload {
  kind: 'model_3d';
  model_asset_id: number;
  stage_height: number;
}

export type ArtifactPayload = HtmlArtifactPayload | Model3dArtifactPayload;

// ---------------------------------------------------------------------------
// Evidence documents
// ---------------------------------------------------------------------------

interface EvidenceDocumentBase {
  id: number;
  title: string;
  description: string | null;
  evidence_type: EvidenceType;
  is_vital_for_conviction: boolean;
}

/**
 * The finished document, keyed on `viewer_strategy`.
 *
 * `paper_finish` is folded into the union rather than typed as an independent
 * `PaperFinish | null` on purpose. The server requires a finish if and only if
 * the strategy is `paper`, and a separately nullable field would let the client
 * build `{ viewer_strategy: 'media', paper_finish: 'manila' }` and only learn
 * about it from a 422. Narrowing on `viewer_strategy` makes the finish known to
 * be absent without a runtime check.
 *
 * A `media` evidence carries its content in `assets`, so its payload is always
 * `null`; an `artifact` may be empty until an admin fills it in.
 */
export interface PaperEvidence extends EvidenceDocumentBase {
  viewer_strategy: typeof ViewerStrategy.Paper;
  paper_finish: PaperFinish;
  content_payload: PagedContentPayload;
}

export interface TerminalEvidence extends EvidenceDocumentBase {
  viewer_strategy: typeof ViewerStrategy.Terminal;
  paper_finish: null;
  content_payload: PagedContentPayload;
}

export interface MediaEvidence extends EvidenceDocumentBase {
  viewer_strategy: typeof ViewerStrategy.Media;
  paper_finish: null;
  content_payload: null;
}

export interface ArtifactEvidence extends EvidenceDocumentBase {
  viewer_strategy: typeof ViewerStrategy.Artifact;
  paper_finish: null;
  content_payload: ArtifactPayload | null;
}

export type EvidenceDocument =
  | PaperEvidence
  | TerminalEvidence
  | MediaEvidence
  | ArtifactEvidence;

// ---------------------------------------------------------------------------
// Transport shapes
// ---------------------------------------------------------------------------

export interface EvidenceAsset {
  kind: AssetKind;
  url: string;
  mime: string | null;
  bytes: number | null;
  /**
   * Free-form JSON from the model, which casts it to a PHP array. An empty
   * column therefore arrives as `[]`, not `{}`, and the type has to allow it.
   */
  meta: JsonObject | null;
}

/** A JSON value bag, in either the object or the array flavour PHP can emit. */
export type JsonObject = Record<string, unknown> | unknown[];

export type MediaLookup = {
  [K in AssetKind]: (Omit<EvidenceAsset, 'kind' | 'meta'> & { meta: JsonObject | null }) | null;
};

/**
 * One card on the evidence board.
 *
 * Carries no `content_payload` and no `assets`: the server strips both so a
 * long report is not duplicated into the initial room load, into every Reverb
 * event, and into every client's memory. `thumbnail_url` is the one image the
 * board is allowed to show.
 */
export interface EvidenceBoardEntry {
  id: number;
  title: string;
  description: string | null;
  evidence_type: EvidenceType;
  viewer_strategy: ViewerStrategy;
  paper_finish: PaperFinish | null;
  is_initial: boolean;
  is_vital_for_conviction: boolean;
  order_index: number;
  thumbnail_url: string | null;
  /** Server-derived from the strategy. Trust it rather than recomputing it. */
  is_paged: boolean;
}

/**
 * A single inspected evidence, from the room-scoped detail route.
 *
 * This is the only response that carries `content_payload`, and the server only
 * returns it once the room holds the evidence. It deliberately has no
 * `is_initial` and no `order_index`; those are board concerns.
 *
 * The transport is a union on `viewer_strategy` for the same reason the stored
 * document is. It used to be one flat interface carrying
 * `content_payload: unknown` and a nullable finish, which meant the guarantees
 * above held for the type but not for the value a viewer received: a `media`
 * entry could carry a paged payload, and a `paper` entry could arrive with no
 * finish, with nothing left to catch it. Each variant now states the payload
 * its strategy is allowed to hold.
 */
interface EvidenceDetailBase extends EvidenceDocumentBase {
  assets: EvidenceAsset[];
  media: MediaLookup;

  /**
   * Signature id to public path, straight from the server's catalog.
   *
   * A signature block stores an id, not a filename. Rebuilding the id to
   * filename mapping here would reintroduce the fragile assumption the catalog
   * exists to remove, so the lookup travels with the document.
   */
  signature_paths: Record<string, string>;
}

export interface PaperEvidenceDetail extends EvidenceDetailBase {
  viewer_strategy: typeof ViewerStrategy.Paper;
  paper_finish: PaperFinish;
  content_payload: PagedContentPayload;
}

export interface TerminalEvidenceDetail extends EvidenceDetailBase {
  viewer_strategy: typeof ViewerStrategy.Terminal;
  paper_finish: null;
  content_payload: PagedContentPayload;
}

export interface MediaEvidenceDetail extends EvidenceDetailBase {
  viewer_strategy: typeof ViewerStrategy.Media;
  paper_finish: null;
  content_payload: null;
}

export interface ArtifactEvidenceDetail extends EvidenceDetailBase {
  viewer_strategy: typeof ViewerStrategy.Artifact;
  paper_finish: null;
  content_payload: ArtifactPayload | null;
}

export type EvidenceDetailEntry =
  | PaperEvidenceDetail
  | TerminalEvidenceDetail
  | MediaEvidenceDetail
  | ArtifactEvidenceDetail;

/** The variants that page, i.e. the ones a paged viewer can receive. */
export type PagedEvidenceDetail = PaperEvidenceDetail | TerminalEvidenceDetail;

// ---------------------------------------------------------------------------
// Runtime narrowing
//
// `content_payload` is typed `unknown` on purpose: it is whatever JSON the
// server validated, and the type system cannot know which strategy's variant
// it is. These guards are the one place that assumption is discharged, so the
// viewers below can rely on a checked shape rather than a cast.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDraftBlock(value: unknown): value is DraftEvidenceBlock {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (typeof value.type !== 'string') return false;
  if (!isRecord(value.props)) return false;

  return Object.values(EvidenceBlockType).includes(value.type as EvidenceBlockType);
}

// -- Stored-document guards ------------------------------------------------
//
// The draft guard above is deliberately loose, because a block being authored
// has not satisfied its declared props yet. That looseness is wrong for a stored
// document: the server validated it, so a well-formed response narrows to the
// real `EvidenceBlock` union instead of `Record<string, unknown>`, and a viewer
// can rely on each block's props without a cast.

function isTextBlockProps(value: unknown): value is TextBlockProps {
  return (
    isRecord(value) &&
    typeof value.html === 'string' &&
    isOneOf(value.align, ['left', 'center', 'right', 'justify']) &&
    isOneOf(value.size, ['small', 'body', 'lead', 'heading'])
  );
}

function isTableBlockProps(value: unknown): value is TableBlockProps {
  return (
    isRecord(value) &&
    Array.isArray(value.headers) &&
    value.headers.every((cell) => typeof cell === 'string') &&
    Array.isArray(value.rows) &&
    value.rows.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string')) &&
    typeof value.caption === 'string' &&
    typeof value.dense === 'boolean'
  );
}

function isSignatureBlockProps(value: unknown): value is SignatureBlockProps {
  return (
    isRecord(value) &&
    typeof value.signature_id === 'number' &&
    typeof value.label === 'string' &&
    typeof value.verified === 'boolean'
  );
}

function isStampBlockProps(value: unknown): value is StampBlockProps {
  return (
    isRecord(value) &&
    typeof value.text === 'string' &&
    isOneOf(value.variant, ['red', 'blue', 'black']) &&
    typeof value.rotation === 'number' &&
    isOneOf(value.font_size, ['auto', 'small', 'medium', 'large'])
  );
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/**
 * A JSON container of either flavour.
 *
 * The model casts `meta` to a PHP array, so a column holding `{}` reaches the
 * wire as `[]`: an empty JSON object and an empty array are indistinguishable
 * after that cast. Accepting only a plain object here would reject every asset
 * whose metadata is empty, so both are allowed and the type says so.
 */
function isJsonContainer(value: unknown): value is Record<string, unknown> | unknown[] {
  return isRecord(value) || Array.isArray(value);
}

/** Narrows a stored block to the `EvidenceBlock` union, props included. */
export function isEvidenceBlock(value: unknown): value is EvidenceBlock {
  if (!isDraftBlock(value)) return false;

  switch (value.type) {
    case EvidenceBlockType.Text:
      return isTextBlockProps(value.props);
    case EvidenceBlockType.Table:
      return isTableBlockProps(value.props);
    case EvidenceBlockType.Signature:
      return isSignatureBlockProps(value.props);
    case EvidenceBlockType.Stamp:
      return isStampBlockProps(value.props);
    default:
      return false;
  }
}

export function isEvidencePage(value: unknown): value is EvidencePage {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    Array.isArray(value.blocks) &&
    value.blocks.every(isEvidenceBlock)
  );
}

/**
 * True when the payload is a usable stored paged document.
 *
 * Unlike the draft guard this checks every block's props against its own
 * schema, so a successful narrowing is a real `PagedContentPayload` rather than
 * a bag of unknown values.
 */
export function isPagedContentPayload(payload: unknown): payload is PagedContentPayload {
  if (!isRecord(payload)) return false;
  if (!Array.isArray(payload.pages)) return false;

  return payload.pages.every(isEvidencePage);
}

/**
 * The loose counterpart, for payloads that are still being authored.
 *
 * Kept separate from `isPagedContentPayload` on purpose: reusing the strict
 * guard in the editor would reject a block the moment it was created, before
 * the author had filled in its required fields.
 */
export function isDraftPagedPayload(payload: unknown): payload is DraftPagedPayload {
  if (!isRecord(payload)) return false;
  if (!Array.isArray(payload.pages)) return false;

  return payload.pages.every(
    (page) => isRecord(page) && typeof page.id === 'string' && Array.isArray(page.blocks) && page.blocks.every(isDraftBlock)
  );
}

export function isHtmlArtifactPayload(payload: unknown): payload is HtmlArtifactPayload {
  return isRecord(payload) && payload.kind === 'html' && typeof payload.html === 'string';
}

export function isModel3dArtifactPayload(payload: unknown): payload is Model3dArtifactPayload {
  return (
    isRecord(payload) &&
    payload.kind === 'model_3d' &&
    typeof payload.model_asset_id === 'number' &&
    typeof payload.stage_height === 'number'
  );
}

/**
 * Narrows a detail response to the paged document a paper or terminal evidence
 * carries. A strategy that does not page has no paged payload, so this is the
 * guard the viewer routes on rather than a standalone truthiness check.
 *
 * The argument is the paged half of the union, so a caller that has already
 * switched on `viewer_strategy` gets `PagedContentPayload | null` rather than
 * having to re-derive which strategies page.
 */
export function asPagedDocument(detail: PagedEvidenceDetail): PagedContentPayload | null {
  return isPagedContentPayload(detail.content_payload) ? detail.content_payload : null;
}

// ---------------------------------------------------------------------------
// Wire parsing
//
// The detail route's JSON arrives as `any` from `response.json()`, and the old
// code laundered it into this union with a cast: the types said "a media entry
// has a null payload" and nothing checked that the value agreed. These guards
// are the one place the transport is trusted, so the invariants hold for the
// values a viewer receives and not merely for the declared shape.
// ---------------------------------------------------------------------------

function isEvidenceAsset(value: unknown): value is EvidenceAsset {
  if (!isRecord(value)) return false;

  return (
    isOneOf(value.kind, Object.values(AssetKind)) &&
    typeof value.url === 'string' &&
    (value.mime === null || typeof value.mime === 'string') &&
    (value.bytes === null || typeof value.bytes === 'number') &&
    (value.meta === null || isJsonContainer(value.meta))
  );
}

function isMediaLookup(value: unknown): value is MediaLookup {
  if (!isRecord(value)) return false;

  return Object.values(AssetKind).every((kind) => {
    const entry = value[kind];

    return entry === null || entry === undefined || isEvidenceAsset({ ...entry, kind });
  });
}

function isSignaturePaths(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((path) => typeof path === 'string');
}

function hasDocumentBaseFields(value: Record<string, unknown>): boolean {
  return (
    typeof value.id === 'number' &&
    typeof value.title === 'string' &&
    (value.description === null || typeof value.description === 'string') &&
    isOneOf(value.evidence_type, Object.values(EvidenceType)) &&
    typeof value.is_vital_for_conviction === 'boolean'
  );
}

function hasDetailCommonFields(value: Record<string, unknown>): boolean {
  return (
    Array.isArray(value.assets) &&
    value.assets.every(isEvidenceAsset) &&
    isMediaLookup(value.media) &&
    isSignaturePaths(value.signature_paths)
  );
}

function isPaperFinish(value: unknown): value is PaperFinish {
  return isOneOf(value, Object.values(PaperFinish));
}

/**
 * Parses one detail response, or returns null when it does not hold up.
 *
 * Each strategy is validated against the payload only that strategy may carry,
 * so an entry that arrives with a payload its viewer cannot render is rejected
 * at the boundary instead of reaching a renderer.
 */
export function toEvidenceDetailEntry(value: unknown): EvidenceDetailEntry | null {
  if (!isRecord(value)) return null;
  if (!hasDocumentBaseFields(value)) return null;
  if (!hasDetailCommonFields(value)) return null;

  // Built field by field rather than spread, so a response cannot smuggle extra
  // unvalidated properties into the typed document.
  const base: EvidenceDetailBase = {
    id: value.id as number,
    title: value.title as string,
    description: value.description as string | null,
    evidence_type: value.evidence_type as EvidenceType,
    is_vital_for_conviction: value.is_vital_for_conviction as boolean,
    assets: value.assets as EvidenceAsset[],
    media: value.media as MediaLookup,
    signature_paths: value.signature_paths as Record<string, string>,
  };

  const payload = value.content_payload;
  const finish = value.paper_finish;
  // The server always sends an explicit null, but tolerating an absent key keeps
  // a payload that omits it from being rejected outright.
  const hasNoFinish = finish === null || finish === undefined;

  switch (value.viewer_strategy) {
    case ViewerStrategy.Paper:
      if (!isPaperFinish(finish) || !isPagedContentPayload(payload)) return null;
      return { ...base, viewer_strategy: ViewerStrategy.Paper, paper_finish: finish, content_payload: payload };

    case ViewerStrategy.Terminal:
      if (!hasNoFinish || !isPagedContentPayload(payload)) return null;
      return { ...base, viewer_strategy: ViewerStrategy.Terminal, paper_finish: null, content_payload: payload };

    case ViewerStrategy.Media:
      if (!hasNoFinish || payload !== null) return null;
      return { ...base, viewer_strategy: ViewerStrategy.Media, paper_finish: null, content_payload: null };

    case ViewerStrategy.Artifact: {
      if (!hasNoFinish) return null;
      if (payload !== null && !isHtmlArtifactPayload(payload) && !isModel3dArtifactPayload(payload)) return null;

      return {
        ...base,
        viewer_strategy: ViewerStrategy.Artifact,
        paper_finish: null,
        content_payload: payload as ArtifactPayload | null,
      };
    }

    default:
      return null;
  }
}

/**
 * A full evidence record as the admin endpoints return it.
 *
 * The admin case route eager-loads `evidences.assets` and returns whole models,
 * so this carries the authoring fields the board and detail shapes omit. It is
 * the document union intersected with those, which keeps the
 * `viewer_strategy` narrowing intact: an admin can still not build a `media`
 * evidence with a paper finish.
 */
export type AdminEvidence = EvidenceDocument & {
  case_id: number;
  is_initial: boolean;
  order_index: number;
  created_at: string | null;
  updated_at: string | null;
};

// ---------------------------------------------------------------------------
// Admin authoring schema (fetched, never hard-coded)
// ---------------------------------------------------------------------------

export const BlockFieldInput = {
  RichText: 'rich_text',
  Textarea: 'textarea',
  Text: 'text',
  Select: 'select',
  Toggle: 'toggle',
  Number: 'number',
  StringRow: 'string_row',
  StringGrid: 'string_grid',
  Signature: 'signature',
} as const;

export type BlockFieldInput =
  (typeof BlockFieldInput)[keyof typeof BlockFieldInput];

export interface BlockFieldSchema {
  name: string;
  input: BlockFieldInput;
  label: string;
  required: boolean;
  default: unknown;
  options?: string[];
  min?: number;
  max?: number;
  max_bytes?: number;
  sanitize?: string;
}

export interface BlockSchema {
  type: EvidenceBlockType;
  label: string;
  fields: BlockFieldSchema[];
}

export interface EvidenceTypeOption {
  value: EvidenceType;
  label: string;
}

/** `GET /api/admin/evidence-schema` */
export interface EvidenceSchema {
  blocks: BlockSchema[];
  paper: {
    width: number;
    height: number;
    finishes: PaperFinish[];
  };
  strategies: ViewerStrategy[];
  types: EvidenceTypeOption[];
  model_3d_enabled: boolean;

  /**
   * The per-type presentation matrix, served by the same legality service that
   * validates writes.
   *
   * The editor reads this to decide which strategies to offer and which payload
   * editor to show. Keeping a client-side copy would be a second source of truth
   * that quietly diverges the next time a type is re-scoped.
   */
  strategy_rules: Record<
    EvidenceType,
    {
      strategies: ViewerStrategy[];
      default_strategy: ViewerStrategy | null;
      default_finish: PaperFinish;
      is_paged: boolean;
    }
  >;
}

/** `GET /api/admin/signatures` */
export interface SignatureOption {
  id: number;
  name: string;
  path: string;
}
