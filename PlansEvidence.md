# Evidence Architecture: Block-Based Document System

**Status:** Approved. Ready to build.
**Created:** 2026-09-29
**Scope:** Replaces the 12 evidence sub-type dispatch tables with one universal A4
document viewer and a block-based admin builder.
**Out of scope:** Media viewer, testimony viewer — both unchanged.

---

## 0. How to Use This Document

This document is written to be executable by a fresh session with no prior context
from the design conversation. Every claim about the existing codebase was verified
by reading the files, and every file reference includes a line number.

**Build order is strict: Phase 1 -> Phase 2 -> Phase 3.** Phases 1 and 2 are safe to
execute in one session. Phase 3 (the admin builder) is large enough that it is
reasonable to split across two sessions at the point marked "Phase 3 split point."

**Do not skip the Phase 1 visual gate.** It is the only mechanism that guarantees
the new block templates faithfully reproduce the 12 existing viewers.

### Verified-facts disclaimer

Line numbers were accurate as of 2026-09-29. If a referenced line no longer matches,
open the file and search for the surrounding symbol name instead of assuming the
architecture changed.

---

## 1. Project Orientation

### Stack

| Layer | Tech | Notes |
|---|---|---|
| Frontend | React 19 + TypeScript ~6 + Vite 8 | `investigation-game-frontend/` |
| Styling | Plain CSS + CSS Modules | No Tailwind, no CSS-in-JS. Two file conventions coexist: global classnames (`Foo.css`) and scoped modules (`Foo.module.css`). |
| Drag & drop | `@dnd-kit/core` ^6.3.1 | Already a dependency. Used in `EvidenceCard.tsx` and `GameRoomLayout`. |
| Data fetching | `@tanstack/react-query` ^5 | Admin panel uses it; GameRoom uses custom hooks. |
| i18n | `i18next` + `react-i18next` | See section 1.4. |
| Sanitization | `dompurify` ^3 | See section 1.5. |
| Backend | Laravel + PHP | `investigation-game-backend/` |
| Auth | Laravel Sanctum (personal access tokens) | |

### 1.1 Directory layout (frontend)

```
investigation-game-frontend/src/
  components/           ErrorBoundary
  context/              RoomContext, TargetingContext
  hooks/                useAuth, useDynamicList, useGameRoom, useViewedItems, ...
  locales/{en,ar}/      translation.json (game) + translationAdmin.ts (admin)
  pages/
    Admin/
      components/       AdminUI/index.tsx (form primitives), EntityDashboard,
                        MediaUploader, AdminFormLayout, AdminGuard
      context/          AdminContext
      forms/            CaseForm, EvidenceForm, CharacterForm, LevelForm, ...
        Shared/          EvidenceMetadataFields, EntityList, useDynamicList-style helpers
          MetadataFields/  12 per-sub_type field editors  <-- DELETED IN PHASE 3
      hooks/            useAdminForm, useAdminMutations, useAdminData, useNodeBuilder
      utils/            formUtils.ts, validators.ts, questionUtils.ts
    GameRoom/
      tabs/
        EvidenceBoard/
          EvidenceModal.tsx          <-- top-level viewer dispatch
          EvidenceCard.tsx           <-- top-level card dispatch
          EvidenceVariants/          <-- board card components
            DocumentEvidence.tsx       <-- sub_type dispatch
            ForensicEvidence.tsx       <-- sub_type dispatch
            DocumentEvidenceVariants/  <-- 7 DELETED IN PHASE 2
            ForensicEvidenceVariants/  <-- 5 DELETED IN PHASE 2
          Viewers/                    <-- modal viewer components
            ViewersContainer.tsx      A4 zoom/scroll shell - UNCHANGED
            DocumentViewer.tsx          <-- DELETED IN PHASE 2
            ForensicViewer.tsx          <-- DELETED IN PHASE 2
            DocumentViewers/            <-- 7 DELETED IN PHASE 2
            ForensicViewers/            <-- 5 DELETED IN PHASE 2
            MediaViewer.tsx           UNCHANGED
            TestimonyViewer.tsx       UNCHANGED
  services/             api.ts (game), adminApi.ts (admin)
  types/
    evidence/
      base.ts          BaseEvidence
      document.ts      DocumentEvidence union  <-- DELETED IN PHASE 2
      forensic.ts      ForensicEvidence union  <-- DELETED IN PHASE 2
      index.ts         master Evidence union    <-- REWRITTEN IN PHASE 2
  utils/sanitize.ts     sanitizeHtml
```

### 1.2 Build and verify commands

Run from `investigation-game-frontend/`:

```
npm run lint     # eslint
npm run build    # tsc -b && vite build  -> the build IS the typecheck
```

**There is no test suite.** Verification is lint + build + manual inspection.
Do not write tests; there is no runner configured.

### 1.3 Backend model

`investigation-game-backend/app/Models/Evidence.php`

```php
protected $fillable = [
    'case_id', 'title', 'description', 'evidence_type', 'sub_type',
    'metadata', 'audio_url', 'img_url', 'is_initial', 'is_vital_for_conviction',
];

protected function casts(): array {
    return [
        'evidence_type' => EvidenceType::class,
        'metadata' => 'array',
        'is_initial' => 'boolean',
        'is_vital_for_conviction' => 'boolean',
    ];
}
```

`evidences` table columns relevant here (migrations
`2026_07_25_181226_create_evidences_table.php` and
`2026_08_19_112215_refactor_evidences_for_json_metadata.php`):

| Column | Type | Notes |
|---|---|---|
| `evidence_type` | enum | `document \| testimony \| audio \| image \| forensic` — see `app/Enums/EvidenceType.php` |
| `sub_type` | string nullable | **free-form, zero validation.** Deleted in Phase 3. |
| `metadata` | json nullable | Opaque blob. Cast to `array`. **Stays; gains a `doc` key.** |
| `img_url` | string nullable | Single image. Read-absolute-ized in `Evidence::imgUrl()` (`:37-48`). |
| `audio_url` | string nullable | Single audio. |
| `is_initial` | boolean | Visible from room start. |
| `is_vital_for_conviction` | boolean | Win condition. |

**Critical: nothing on the backend reads `sub_type`.** Only three touch points:

- `app/Models/Evidence.php:19` — fillable
- `app/Http/Controllers/Admin/AdminEvidenceController.php:25,50,70,92` — validation + create/update
- `app/Http/Controllers/Admin/AdminCaseController.php:219` — bulk import mapping

Therefore dropping `sub_type` is safe from the server's perspective, and the backend
cleanup can be deferred to the end of Phase 3 without blocking the frontend.

### 1.4 i18n — Arabic-first, English is effectively untranslated

`src/i18n.ts:27-28`:

```ts
lng: 'ar',
fallbackLng: 'ar',
```

`en/translation.json` is 349 bytes (system + dashboard strings only).
`ar/translation.json` is 28KB and contains everything.

**Practical consequence:** the game runs in Arabic. `t('pages.gameRoom.evidence.viewers.*')`
keys currently only exist in the Arabic file. Every new block label, theme name, and
template name needs an `ar` key at minimum. Add an `en` key too — it costs nothing
and English currently degrades to Arabic.

Admin strings live separately in `src/locales/{en,ar}/translationAdmin.ts` under the
`admin` namespace.

### 1.5 Rich text convention — HTML + DOMPurify

`src/utils/sanitize.ts`:

```ts
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['b','i','em','strong','a','p','span','br','ul','li','ol','div'],
  ALLOWED_ATTR: ['class','href','target'],
};
export const sanitizeHtml = (dirty: string): string => DOMPurify.sanitize(dirty, PURIFY_CONFIG);
```

The `class` attribute is deliberately allowed so authors can use in-world formatting
spans, documented in `AdminUI/index.tsx:70-80` (`FormattingGuide`):

- `<span className="redacted">Text</span>` — black redaction bar
- `<span className="highlighted">Text</span>` — yellow highlighter

`react-markdown` is a dependency but is **not used for evidence**. Do not introduce
markdown and do not duplicate the purify config. All new `prose` blocks must run
their content through `sanitizeHtml`.

### 1.6 Signature assets are procedural

There is no signature picker. Viewers derive a signature image from the evidence ID:

`Viewers/ForensicViewers/BallisticsViewer.tsx:19-23`
```ts
const getSignature = (seed: number) => {
  const idx = (seed % 18) + 1;
  const fileName = idx === 1 ? 'signature.svg' : `signature-${idx}.svg`;
  return `${backendUrl}/assets/signatures/${fileName}`;
};
```

`Viewers/DocumentViewers/ContractViewer.tsx:26-40` uses a two-signature variant of the
same trick. The `signature_row` block must preserve this behaviour using
`evidence.id` as the seed.

### 1.7 Media storage

`app/Services/MediaService.php:11-57` — `store(UploadedFile, caseTitle, subfolder, storeLocally)`:

- **Local path** (`store_locally = true`): writes to
  `public/assets/cases/{case-slug}/{subfolder}/{sha256}.{ext}`, dedupes by content
  hash, returns `/assets/cases/{slug}/{subfolder}/{hash}.{ext}`.
- **Cloudinary** (`false`): returns `secure_url`.

`delete($url)` (`:59-92`) handles both local paths and Cloudinary public IDs. It is
**only ever called for `img_url` and `audio_url`** — see risk R1 in section 8.

### 1.8 RTL and logical properties

The codebase is RTL-aware. Existing CSS uses logical properties
(`margin-inline-start`, `text-align: start`) and explicit `[dir="rtl"]` overrides
for things that need mirroring or rotation flip. Reference implementations:

- `Viewers/DocumentViewers/MemoViewer.css:54-59` — margin + border-radius flip
- `Viewers/DocumentViewers/MemoViewer.css:112-114` — handwriting slant flip
- `Viewers/DocumentViewers/MemoViewer.css:139-146` — sticky-note curl flip
- `Viewers/DocumentViewers/FinancialRecordViewer.css:117-119` — stamp rotation flip
- `Viewers/DocumentViewers/FinancialRecordViewer.css:138-139` — watermark flip

**All new block CSS must follow this pattern.** Use logical properties by default;
add `[dir="rtl"]` overrides for rotations, mirroring, and asymmetric padding.

### 1.9 Existing reusable utilities

- `src/hooks/useDynamicList.ts` — list add/update/remove with optional
  `resequenceField` for automatic renumbering (`:23-30`). Used by the financial
  `pages[].page_number` editor and needed for table rows / meta pairs.
- `src/pages/Admin/components/AdminUI/index.tsx` — `AdminInput`, `AdminTextarea`,
  `AdminSelect`, `AdminCheckbox`, `AdminFileInput`, `AdminRow`, `DynamicListHeader`,
  `RemoveButton`, `AdminEntryToggle`, `JsonPopulator`, `FormattingGuide`.
- `@dnd-kit/core` — `DndContext`, `useDraggable`, `useSortable`, `SortableContext`.

---

## 2. Current Architecture (as verified)

### 2.1 Dispatch chain — 2 hops deep, duplicated twice

| Hop | Location | Count |
|---|---|---|
| `evidence_type` -> viewer | `EvidenceModal.tsx:30-38` | 5 |
| `sub_type` -> document viewer | `DocumentViewer.tsx:22-33` | 7 |
| `sub_type` -> forensic viewer | `ForensicViewer.tsx:20-29` | 5 |
| `evidence_type` -> board card | `EvidenceCard.tsx:11-17` | 5 |
| `sub_type` -> document card | `DocumentEvidence.tsx:16-35` | 7 |
| `sub_type` -> forensic card | `ForensicEvidence.tsx:14-16` | 5 |

The 12 sub-types:

- **document (7):** `correspondence`, `financial`, `journal`, `contract`, `memo`,
  `background_check`, `phone_records`
- **forensic (5):** `autopsy`, `ballistics`, `dna`, `digital_forensics`, `trace_analysis`

`sub_type` is a free-form unvalidated string server-side
(`AdminEvidenceController.php:25` — `'sub_type' => 'nullable|string'`). An
unrecognized value falls through to
`"Document contents illegible or corrupted."` (`DocumentViewer.tsx:40-42`).
Killing it is a genuine correctness win, not just cleanup.

### 2.2 The A4 sheet convention

Every document and forensic viewer hardcodes the same sheet dimensions:

- `Viewers/DocumentViewers/ContractViewer.css:50-51` — `width: 800px; height: 1131px`
- `Viewers/ForensicViewers/BallisticsViewer.css:17-18` — `width: 800px; min-height: 1131px`
- `Viewers/DocumentViewers/FinancialRecordViewer.css:15-16` — `width: 800px; height: 1131px`

800 x 1131 px is A4 at ~96dpi. All of them render inside `ViewersContainer`, which
provides zoom-to-fit in fullscreen and native scroll otherwise
(`ViewersContainer.tsx:29-60`). `EvidenceModal` supplies `isFullscreen` through
`EvidenceContext`.

**Critical detail:** most sheets use `height: 1131px; overflow: hidden`. Content past
A4 is **clipped and silently lost**. A block stack is unbounded, so the sheet must
change to `min-height: 1131px; overflow: visible`.

### 2.3 Correction to the original design premise

There is **no free-form absolute canvas** in the current admin evidence editor.
`EvidenceForm.tsx:152` mounts `EvidenceMetadataFields`, which switches on `sub_type`
into 12 rigid field-group components under
`src/pages/Admin/forms/Shared/MetadataFields/`.

So this refactor is **rigid per-sub-type forms -> flexible block builder**, not
**canvas -> builder**. That makes the change cheaper than originally framed, and it
means the free-form canvas was the thing being escaped rather than migrated from.

---

## 3. Design Decisions and Rationale

### 3.1 ONE universal viewer for document + forensic — AGREED

The easiest half of the work. Because every viewer already renders an identical A4
sheet inside `ViewersContainer`, the universal viewer is just: one 800px sheet plus
a block renderer.

**`ViewersContainer.tsx` and the zoom/pan logic in `EvidenceModal.tsx` need zero
changes.** Do not touch them.

Only required change to the sheet: `height: 1131px; overflow: hidden` becomes
`min-height: 1131px; overflow: visible`. Short documents keep the exact authentic
look; long ones grow instead of losing content.

`testimony`, `image`, and `audio` keep `TestimonyViewer` / `MediaViewer` unchanged.

### 3.2 Remove sub-types entirely — AGREED, with one modification

`sub_type` does two jobs:

- **Job A — viewer dispatch.** Genuinely goes away. Agreed.
- **Job B — board card appearance.** 12 thumbnail components at 240px wide
  (`EvidenceVariants/DocumentEvidence.css:4-8`) that make the evidence board look
  like a spread of actual documents. That variety is most of the board's visual
  appeal and has no other key.

**Resolution:** board cards derive their skin from `metadata.doc.theme` at render
time. No `card_style` column, no replacement field — `sub_type` is deleted outright.

| Theme | Card skin |
|---|---|
| `case_file` | official paper |
| `notebook` | handwritten |
| `ledger` | tabular |
| `dossier` | dossier |
| `lab` | report |

The admin never authors this. It follows from the theme. This removes the
free-form string, removes the 12 magic values, and leaves a single source of truth.

### 3.3 "Naturally reflow for any screen size" — DISAGREED (amended)

The A4 fixed-width sheet *is* the case-file aesthetic, and `ViewersContainer`'s
zoom/pan exists precisely because content does not reflow. If blocks reflow
responsively, the case-file illusion is destroyed and the zoom machinery becomes
pointless.

**Resolution — split the concerns:**

- **Viewer sheet stays 800px** and authentic. Zoom/pan keeps working as today.
- **Admin canvas is fluid/responsive** (roughly 640-960px) so authoring is not cramped.

Reflow happens at the *container* level (phone vs desktop), not by melting the sheet.
This also keeps RTL handling tractable.

### 3.4 Storage — no migration for the data layer — AGREED

Keep the `metadata` JSON column. Introduce a versioned envelope under a new `doc` key.

**Why nested under `metadata.doc` rather than replacing `metadata`:**

- `AdminEvidenceController.php:26` already accepts an opaque JSON string, so this is a
  **frontend-only refactor** for the storage layer.
- Legacy keys stay in the row untouched (simply ignored), so rollback is free.
- `v` is the rename/migrate hatch for future block type changes.
- `Evidence.php:32` already casts `metadata` to `array`. No model change required.

### 3.5 Block-level images — reuse local asset path, no new table — AGREED

`MediaService::store()` already returns a hash-deduped `/assets/...` path (or a
Cloudinary `secure_url`). Add a decoupled upload endpoint that returns `{ url }` and
store that URL directly in the block's props.

**No schema change. No asset library. No orphan GC.**

**Accepted tradeoff:** `MediaService::delete` is only invoked for `img_url` /
`audio_url`. Block images orphan when a document is deleted. Content-hash dedupe
makes this mostly benign (identical files collapse to a single path another document
may still reference), but it is a real, accepted cost — not free. See risk R1.

---

## 4. Data Model

```json
{
  "doc": {
    "v": 1,
    "theme": "case_file",
    "page": { "w": 800, "minH": 1131, "pad": 64 },
    "blocks": [
      {
        "id": "b_1",
        "type": "letterhead",
        "span": 12,
        "props": { "agency": "...", "title": "...", "sub": "..." }
      },
      {
        "id": "b_2",
        "type": "meta_grid",
        "span": 6,
        "props": { "rows": [{ "label": "To", "value": "..." }] }
      }
    ]
  }
}
```

Every block has:

- `id` — stable client key
- `type` — one of the catalog in section 5
- `span` — 1-12 CSS grid columns, so one mechanism handles full-width letterheads
  and two-column body text
- `props` — type-specific payload
- optional `style` — `align`, `tone`, `pad`, `font`

`theme` selects one of 5 token sets that style the sheet. `page` is explicit so a
future page-size change requires no schema change.

### 4.1 TypeScript types (Phase 1 deliverable)

New file `src/types/evidence/doc.ts`. Shape it as a discriminated union on `type` so
the block renderer gets exhaustive checking:

```ts
export type DocTheme = 'case_file' | 'notebook' | 'ledger' | 'dossier' | 'lab';

export interface DocBlockBase {
  id: string;
  span?: number;          // 1-12, default 12
  style?: { align?: 'start'|'center'|'end'; tone?: string; pad?: number };
}

export type DocBlock =
  | (DocBlockBase & { type: 'letterhead';   props: LetterheadProps })
  | (DocBlockBase & { type: 'meta_grid';    props: MetaGridProps })
  | (DocBlockBase & { type: 'prose';        props: ProseProps })
  | (DocBlockBase & { type: 'two_column';   props: TwoColumnProps })
  | (DocBlockBase & { type: 'table';        props: TableBlockProps })
  | (DocBlockBase & { type: 'list';         props: ListProps })
  | (DocBlockBase & { type: 'signature_row';props: SignatureRowProps })
  | (DocBlockBase & { type: 'stamp';        props: StampProps })
  | (DocBlockBase & { type: 'barcode';      props: BarcodeProps })
  | (DocBlockBase & { type: 'watermark';    props: WatermarkProps })
  | (DocBlockBase & { type: 'rule';         props: RuleProps })
  | (DocBlockBase & { type: 'spacer';       props: SpacerProps })
  | (DocBlockBase & { type: 'image';        props: ImageBlockProps })
  | (DocBlockBase & { type: 'annotation';   props: AnnotationProps })
  | (DocBlockBase & { type: 'redaction';    props: RedactionProps })
  | (DocBlockBase & { type: 'diagram';      props: DiagramProps });

export interface DocDocument {
  v: 1;
  theme: DocTheme;
  page: { w: number; minH: number; pad: number };
  blocks: DocBlock[];
}
```

Also export `DOC_THEME_SKINS: Record<DocTheme, string>` for the board-card mapping
(section 3.2), and `DEFAULT_DOC: DocDocument` for new records.

---

## 5. Block Catalog

~15 block types, distilled from the actual visual DNA of the 12 existing viewers.
The "Extracted from" column is a pointer to the old CSS/TSX to copy styling from
before those files are deleted in Phase 2.

| Block | Extracted from | Notes |
|---|---|---|
| `letterhead` | `BallisticsViewer.css:43-61`, `AutopsyViewer.css` `.autopsy-header` | agency line + title + sub-line; theme-styled |
| `meta_grid` | `CorrespondenceViewer.tsx:21-34`, `.autopsy-data-row`, `.ballistics-mini-box` | label/value pairs, 1-4 columns |
| `prose` | `CorrespondenceViewer.tsx:36-38`, `ContractViewer.tsx:64-71`, `JournalViewer` content | rich text via `sanitizeHtml`; `tone: typed \| handwritten \| mono` |
| `two_column` | `AutopsyViewer.tsx:46-88` `.autopsy-body-section` | container block, nests other blocks in 2 equal columns |
| `table` | `FinancialRecordViewer.css:53-78`, `PhoneRecordsViewer` log table | typed columns; `tone: ledger \| log`; negative-amount styling (`.negative` at `FinancialRecordViewer.css:183-185`) |
| `list` | `ContractViewer.tsx:57-60`, `AutopsyViewer.tsx:112-116` | plain / numbered |
| `signature_row` | `ContractViewer.tsx:83-98`, `BallisticsViewer.tsx:109-122` | 1-2 columns; reuses the `evidence.id % 18` lookup (section 1.6) |
| `stamp` | `FinancialRecordViewer.css:99-114`, `ContractViewer.tsx:100-104`, `CorrespondenceViewer.tsx:19` | rotated, colored; `tone: official \| forged \| redacted` |
| `barcode` | `FinancialRecordViewer.css:90-98`, `BallisticsViewer.tsx:34` | uses `Libre Barcode 39`, already loaded in `index.html` |
| `watermark` | `ContractViewer.css:46`, `FinancialRecordViewer.css:122-135` | behind content, rotated, RTL-mirrored |
| `rule` | pagination borders, section dividers | layout primitive |
| `spacer` | section gaps | layout primitive, `height` prop |
| `image` | `img_url` usage, "embedded polaroid" | per-block URL (section 3.5) |
| `annotation` | `BallisticsViewer.tsx:124-128` `.handwritten-note-overlay` | sticky-note scribble, `rotate` prop |
| `redaction` | `AdminUI/index.tsx:76` | established `redacted` span convention |
| `diagram` | `AutopsyViewer.tsx:70-87` SVG body wireframe | whitelist of inline SVG presets — the one thing that does not fit a text block |

### 5.1 Block rendering rules

- Blocks render into a single `display: grid; grid-template-columns: repeat(12, 1fr)`
  container. `span` maps to `grid-column: span N`. A full-width block is `span: 12`.
- Row flow is automatic; blocks stack top to bottom. No absolute positioning anywhere.
- `watermark` and `stamp` are the only blocks allowed `position: absolute`, and only
  relative to the sheet root, never to a parent block. This is what preserves
  reflowability.
- `two_column` is a container block whose `props.columns` hold nested `DocBlock[]`.
  Keep nesting to one level for v1; a recursive renderer is the obvious v2.
- Every `prose` block's content passes through `sanitizeHtml` (section 1.5).
- Every block CSS is scoped under a theme-prefixed root class, and every block must
  include a `box-sizing: border-box` reset for itself and its descendants, matching
  the existing pattern at `BallisticsViewer.css:29-33`.

---

## 6. Templates

`templates.ts` exports 12 named template functions, each returning a **fresh**
`DocDocument` (deep-clone on call — callers mutate the result, so never return a
shared object literal).

These are the "built-in templates from the current viewers."

| Template | Theme | Block composition |
|---|---|---|
| `correspondence` | `case_file` | letterhead, meta_grid(To/From/Subject), prose(body), stamp(confidential), rule, footer |
| `financial` | `ledger` | letterhead, meta_grid(institution/holder/account), table(transactions), watermark(CONFIDENTIAL), footer |
| `journal` | `notebook` | letterhead, prose(handwritten, tone), annotation |
| `contract` | `case_file` | watermark, letterhead, list(parties), prose(terms), signature_row, stamp(valid\|forged) |
| `memo` | `notebook` | letterhead, prose(handwritten) |
| `background_check` | `dossier` | letterhead, meta_grid, list(aliases/associates), image(mugshot), annotation |
| `phone_records` | `ledger` | letterhead, meta_grid(subscriber/carrier/period), table(call log) |
| `autopsy` | `lab` | letterhead, meta_grid(case/date), two_column([data_col],[diagram]), prose sections, signature_row |
| `ballistics` | `lab` | letterhead, barcode, meta_grid(chain of custody), list(exhibits), prose x2, image(micrograph), signature_row, annotation |
| `dna` | `lab` | letterhead, meta_grid, list(loci), stamp |
| `digital_forensics` | `lab` | letterhead, meta_grid, prose |
| `trace_analysis` | `lab` | letterhead, meta_grid, image, prose |

**Note on theme count:** the 5 themes are `case_file`, `notebook`, `ledger`, `dossier`,
`lab`. The `legal` (contract) and `sticky` (memo) looks are expressed as *block props
and accents*, not as themes. Keeping the theme count at 5 keeps the card-skin mapping
in section 3.2 to a simple 1:1 table. If a template genuinely needs a 6th theme,
add it deliberately and extend `DOC_THEME_SKINS` at the same time.

**Existing template gaps to fix while porting:** `formUtils.ts:38-71` is missing a
`phone_records` entry in `documentTemplates` even though
`types/evidence/document.ts:79-85` defines `PhoneRecordsMetadata` and a
`PhoneRecordsViewer` exists. The new templates have no equivalent gap.

---

## 7. Implementation Phases

### Phase 1 — Block engine (frontend only, nothing else changes)

New directory: `src/pages/GameRoom/tabs/EvidenceBoard/DocViewer/`

**Create:**

| File | Contents |
|---|---|
| `../../../../../types/evidence/doc.ts` | Section 4.1 types + `DOC_THEME_SKINS` + `DEFAULT_DOC` |
| `BlockRenderer.tsx` | Maps `type` -> component; renders the 12-col grid |
| `blocks/<Block>.tsx` + `blocks/<Block>.css` | 15 block components |
| `themes.css` | 5 token sets lifted from existing viewer CSS |
| `UniversalDocViewer.tsx` | The A4 sheet: `width: 800px; min-height: 1131px; overflow: visible` |
| `UniversalDocViewer.css` | Sheet shell, wrapping `ViewersContainer` exactly as `DocumentViewer.tsx:36` does |
| `templates.ts` | 12 template functions (section 6) |

`UniversalDocViewer` must wrap its children in `ViewersContainer` with the evidence
prop, replicating the wrapper at `DocumentViewer.tsx:36-45`, so that
`isFullscreen` zoom/pan continues to work unchanged.

**Exit gate — visual fidelity check. Do not skip.**

Render all 12 templates next to their current viewers and compare side by side.
Suggested approach: a temporary route or a temporary admin panel section that
renders `templates.ts` output through `BlockRenderer` beside the old viewer for the
same data. This is a **design-fidelity gate, not a safety gate** — no live data
depends on it — but it is the only mechanism guaranteeing the block templates
reproduce the 12 existing viewers. If a template does not look like its
predecessor, fix the template before proceeding.

Then run `npm run lint` and `npm run build`.

### Phase 2 — Game cutover

**Modify:**

- `EvidenceModal.tsx:30-36` — map both `document` and `forensic` to
  `UniversalDocViewer`; `testimony` / `image` / `audio` untouched
- `EvidenceCard.tsx:11-17` — replace with two theme-skinned card components
- `EvidenceVariants/DocumentEvidence.tsx` — becomes a single generic card driven by
  `metadata.doc.theme`
- `EvidenceVariants/ForensicEvidence.tsx` — same
- `types/evidence/index.ts:41` — collapse `DocumentEvidence | ForensicEvidence` into
  one `DocEvidence` member

**Delete (~75 files, ~5,000 lines of CSS):**

- `Viewers/DocumentViewer.tsx`, `Viewers/ForensicViewer.tsx`
- `Viewers/DocumentViewers/*` (7 TSX + 7 CSS)
- `Viewers/ForensicViewers/*` (5 TSX + 5 CSS)
- `EvidenceVariants/DocumentEvidenceVariants/*` (7 TSX + 7 CSS)
- `EvidenceVariants/ForensicEvidenceVariants/*` (5 TSX + 5 CSS)
- `types/evidence/document.ts`, `types/evidence/forensic.ts`
- `Viewers/MediaViewer.tsx` + `.css` and `Viewers/TestimonyViewer.tsx` + `.css` are
  **NOT** deleted. `ViewersContainer.tsx` + `.css` are **NOT** deleted.

**Ordering constraint:** the type change and the deletion must land in the same
commit. `DocumentEvidence` / `ForensicEvidence` are discriminated unions consumed in
~15 places via `Extract<..., { sub_type: 'x' }>`. Collapsing them is mechanical but
touches every viewer variant — splitting it from the delete produces a broken
intermediate that does not compile.

After deleting, run `npm run build` to surface any missed `sub_type` reference.

### Phase 3 — Admin builder + backend

**Phase 3 split point.** Section 3a (builder UI) and 3b (form integration +
backend) are separable sessions. 3a is the bulk of the work.

#### 3a — The builder

New directory: `src/pages/Admin/forms/EvidenceForm/DocBuilder/`

Three panes, matching the existing admin idiom (`glass-panel`, `--font-mono` headers,
cyan/amber accents):

1. **Block palette** — `useDraggable` per block type. An "Insert template" group on
   top with the 12 templates.
2. **Canvas** — live A4 preview rendering through the **same** `BlockRenderer` as the
   game viewer. This is what makes "see how it looks in real time" free — there is
   only one renderer. Canvas is fluid/responsive (section 3.3), not fixed 800px.
3. **Inspector** — per-block props editor. Reuse `AdminInput` / `AdminTextarea` /
   `AdminSelect` / `AdminCheckbox` from `AdminUI`, plus `useDynamicList` for repeated
   rows (table rows, meta pairs, signature columns).

**DnD mechanics:** `DndContext` + `SortableContext` (vertical list) for reorder, with
thin insert-line drop zones rendered between blocks. This is sortable-list dnd, not
free-form canvas dnd — more robust and it matches the block-stack model.

Block props editing for `image` blocks uses the new upload endpoint (3b).

#### 3b — Form integration and backend

**Modify:**

- `EvidenceForm.tsx` — type select routes to builder / transcript / upload panel.
  Remove `sub_type` from lines 14, 40, 48, 64, 106, 113, 120, 133, 146, 165.
  Line 106/120/165 currently special-case `sub_type === 'background_check'` to
  require a mugshot; with sub-types gone, the primary-image upload becomes an
  unconditional optional field on the document panel.
- `utils/formUtils.ts:17-113` — replace `getEvidenceMetadataTemplate` with a doc
  skeleton emitter (returns `{ doc: { v: 1, theme: 'case_file', page: {...},
  blocks: [] } }`)
- `utils/validators.ts:29-34` — `validateEvidenceForm` no longer requires a sub-type;
  instead require `metadata.doc.blocks.length >= 1` for `document` / `forensic`
- `AdminUI/index.tsx` — add a block image upload control
- `components/MediaUploader.tsx` — likely already provides most of what the block
  image uploader needs; read it before writing a new one

**Create:**

- Backend route + `AdminMediaController` (or one route on
  `AdminEvidenceController`) — accept an image file, return `{ url }` via
  `MediaService::store`. Gate behind the existing `IsAdmin` middleware like all
  other admin routes.

**Delete:**

- `src/pages/Admin/forms/Shared/MetadataFields/*` (12 TSX + `index.ts` + `types.ts`)
- `src/pages/Admin/forms/Shared/EvidenceMetadataFields.tsx` — or reduce it to the
  testimony transcript field only, since testimony is unchanged

**Backend hygiene (safe to do last — nothing reads `sub_type`):**

- Migration dropping the `sub_type` column (nullable, so it is safe to defer)
- `app/Models/Evidence.php:19` — remove from fillable
- `AdminEvidenceController.php:25,50,70,92` — remove validation and assignment
- `AdminCaseController.php:219` — remove from bulk import mapping, and drop
  `sub_type` from the example JSON emitted by the form

After each sub-step run `npm run lint` and `npm run build`.

---

## 8. Known Risks and Constraints

**R1 — Orphaned block images.** `MediaService::delete` is only called for `img_url` /
`audio_url`. Block images stored as `/assets/...` paths persist after a document is
deleted. Mostly benign due to sha256 dedupe, but accepted, not solved. See 3.5.

**R2 — i18n load.** Every new block label ("To:", "From:", "Case No.", "Page X of Y",
signature captions), all 5 theme names, and all 12 template names needs an `ar` key
in `src/locales/ar/translation.json`. See section 1.4 — English is currently near-empty
and falls back to Arabic.

**R3 — RTL correctness.** Blocks must use logical properties and ship `[dir="rtl"]`
overrides for rotations and mirroring (watermarks, stamps, handwriting slant,
sticky-note curl). See section 1.8 for reference implementations.

**R4 — Clip regression.** Changing `height` -> `min-height` on the sheet alters
`ViewersContainer`'s fit calculation (`ViewersContainer.tsx:34-47`), which measures
`offsetHeight` of the first child. Longer documents will now scale down further in
fullscreen. Expected behavior, but verify it looks right rather than microscopic.

**R5 — Type-safety blast radius.** `DocumentEvidence` / `ForensicEvidence` are
discriminated unions consumed in ~15 places via `Extract<..., { sub_type: 'x' }>`.
The collapse plus the delete must be one atomic change. See Phase 2 ordering.

**R6 — Dead migration path.** The old `sub_type` + legacy-metadata rows have no live
data to migrate (confirmed pre-seed, no live cases). The `doc.v` version field is
still mandatory so that a future block rename has a migration hook. Do not skip `v`
even though nothing needs migrating today.

---

## 9. Verification

No test suite exists. Verification is:

1. `npm run lint` from `investigation-game-frontend/`
2. `npm run build` from `investigation-game-frontend/` — runs `tsc -b` first, so it
   is also the typecheck
3. **Phase 1 gate** — all 12 templates rendered beside their current viewers and
   visually compared
4. **Phase 2/3** — open each of the 12 templates in the game viewer at mobile,
   tablet, and desktop widths, in both `ltr` and `rtl`
5. **Phase 3** — create, edit, and delete a document evidence record through the new
   builder; confirm block image upload returns a working URL and renders

---

## 10. Out of Scope

Explicitly **not** part of this work:

- Media viewer and testimony viewer — unchanged
- `ViewersContainer.tsx` zoom/pan behavior — unchanged
- True multi-page A4 pagination (page breaks). v1 lets the sheet grow past A4.
  A `page_break` prop on blocks is the natural v2.
- The `phone_records` gap in `formUtils.ts` templates — moot, replaced by blocks
- Case import / bulk authoring beyond dropping `sub_type` from the example JSON
- The `gameCase.evidences` over-broad eager-load at `GameRoomController.php:134`,
  which leaks unearned case content to every player. Unrelated to this refactor but
  worth its own ticket.
- The exact-set-equality DA check at `InvestigationRequestService.php:31-34`. Also
  unrelated; also worth its own ticket.


Latest session progress, continue from this point: 
[✓] Survey game-side dispatch (EvidenceModal, EvidenceCard, variants) and evidence types
[✓] Survey admin side (EvidenceForm, formUtils, validators, MetadataFields, AdminUI, MediaUploader)
[✓] Add @dnd-kit/sortable to package.json + install
[•] Phase 3b backend: block image upload endpoint via MediaService
[ ] Phase 3a: DocBuilder three-pane UI (palette / canvas / inspector) with dnd-kit
[ ] Phase 3b: form integration (formUtils doc skeleton, validators, EvidenceForm sub_type removal)
[ ] Phase 2: type collapse (document.ts + forensic.ts -> DocEvidence)
[ ] Phase 2: viewer cutover in EvidenceModal + theme-driven board cards
[ ] Phase 2: delete 12 legacy viewers/variants and their CSS
[ ] Add ar i18n keys for block labels, themes, templates
[ ] Verify: lint + build, validate the test-case JSON against the new form path