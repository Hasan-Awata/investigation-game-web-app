# Evidence — Pre-existing Defects (Out of Scope)

> All 15 defects below were discovered while auditing the evidence flow for the Digital surface. They are **documented only** — not fixed in this PR. Filed here so they don't get lost.

---

## 1. Audio evidence never plays
**File:** `src/pages/GameRoom/tabs/EvidenceBoard/Viewers/MediaViewer.tsx:18`  
**Impact:** Every audio row renders "no media found". The code reads `evidence.img_url` for both image and audio types, but audio lives in `audio_url` (model accessor populates it, admin form uploads to it).  
**Fix:** `const mediaUrl = evidence.evidence_type === 'audio' ? evidence.audio_url : evidence.img_url;`

---

## 2. `DOC_THEME_SKINS` has zero importers
**File:** `src/types/evidence/doc.ts:297`  
**Impact:** Theme-driven card skins were specced (Plan §3.2) and never built. All 5 paper themes render identically on the evidence board. Cards still use per-`evidence_type` skins (`DocumentEvidence.tsx` / `ForensicEvidence.tsx`) which ignore `metadata.doc.theme`.  
**Fix:** `EvidenceCard.tsx` + `EvidenceVariants/*` map `metadata.doc.theme` → skin via `DOC_THEME_SKINS`; add 5 digital skins when Digital lands.

---

## 3. Block reordering is inert
**Files:** `DocBuilder.tsx:53-67` (`handleDragOver`), `DocBuilder.tsx:143` (`SortableContext`)  
**Impact:** Palette drag only appends; no `useSortable` anywhere; no drag handles, no insert-line drop zones. Authors can only append, then delete/duplicate one at a time via Inspector.  
**Fix:** Add `useSortable` to block wrappers in `DocCanvas.tsx`, pass `cellWrapper` with drag handle, wire `SortableContext` items + strategy.

---

## 4. Nested `two_column` blocks uneditable
**Files:** `BlockRenderer.tsx:51`, `TwoColumnBlock.tsx:30,33`  
**Impact:** `BlockRenderer` does not forward `cellWrapper` into `two_column` children, so nested blocks are neither selectable (no outline) nor reachable by the Inspector (which resolves selection only against `doc.blocks` top level). Any template with a `two_column` is half-frozen on edit.  
**Fix:** `BlockRenderer` must pass `cellWrapper` recursively; `TwoColumnBlock` must use it for both `left` and `right` columns.

---

## 5. Builder toolbar desyncs from the document
**File:** `DocBuilder.tsx:26-27`  
**Impact:** `theme` and `pagePad` are `useState` initialised from `doc` with no sync effect. Applying a template writes `theme: templateDoc.theme` into the doc but leaves local `theme` stale; switching evidence in edit mode leaves the previous document's theme/pad displayed while the canvas shows the new one.  
**Fix:** `useEffect(() => setTheme(doc.theme), [doc.theme])` + same for `pagePad`; or derive from `doc` directly (controlled).

---

## 6. 10 of 12 template labels render as raw snake_case
**Files:** `BlockPalette.tsx:82`, `DocBuilder.tsx:155`  
**Impact:** Key derivation `` `doc${name.charAt(0).toUpperCase() + name.slice(1)}` `` mismatches actual i18n keys (`docFinancial`, `docBackground`, `forensicAutopsy`, `forensicDigital`, `forensicTrace`, `forensicBallistics`, `forensicDna`, `docPhoneRecords`, `docJournal`, `docContract`, `docMemo`, `docCorrespondence`). Only correspondence/journal/contract/memo resolve; the rest show "financial_record", "autopsy", etc. The `typeof labelValue === 'string' ? … : name` guard hides the miss.  
**Fix:** Either align i18n keys to the derivation, or change derivation to a lookup map.

---

## 7. Dead code ≈ 800 lines
| File | Lines | Notes |
|---|---|---|
| `components/DocBuilder/BlockInspector.tsx` | ~505 | 0 importers; monolithic duplicate inspector |
| `components/DocBuilder/docTree.ts` | ~120 | `BlockPath` immutable-tree helper; imported only by dead `BlockInspector` |
| `components/DocBuilder/labels.ts` | ~80 | imported only by dead `BlockInspector` |
**Impact:** Dead code inflates bundle, confuses navigation, rots silently.  
**Fix:** Delete all three. (The live `DocBuilder` uses flat id-based find/splice.)

---

## 8. Duplicate block factories
**Files:** `blockFactory.ts` (0 importers, exhaustively typed, `DEFAULT_SPANS` table, `structuredClone` deep clone) vs `DocBuilder.tsx:224-262` (weaker inline version, silent `default` branch → `prose`, no span table)  
**Impact:** Two implementations of the same logic; the good one is dead; the live one has a silent fallback bug.  
**Fix:** Delete `DocBuilder.tsx:224-262`, import and use `blockFactory.createBlock` + `cloneBlock`.

---

## 9. `normalizeDoc` is a truthiness filter, not a validator
**File:** `doc.ts:335`  
**Impact:** Only requires `!!b && typeof b === 'object' && 'type' in b`. A block with `type: 'table'` but `props: undefined` survives; `TableBlock` then reads `block.props.columns` and throws. The "one bad stored block cannot blank an entire case file" guarantee is weaker than the comment claims — the crash happens inside the block component, not the lookup.  
**Fix:** Require `props` to be an object per block type (or a schema validator). Terminal's `normalizeTerminal` already does this strictly — consider backporting.

---

## 10. Import bypasses all evidence validation
**File:** `AdminCaseController.php:176-182, 213-226`  
**Impact:** No `evidences.*` validation rules — arbitrary `evidence_type` strings, missing `title`, and doc envelopes with zero blocks all import successfully into a game-breaking state that only the frontend form guards against.  
**Fix:** Add `evidences.*` rules + reuse `EvidenceMetadataMatchesType` rule (already in scope for Digital — backport to cover existing types).

---

## 11. `metadata` dual wire contract
**Files:** `AdminEvidenceController.php:40-42` (string) vs `AdminCaseController.php:219` (array)  
**Impact:** CRUD accepts a JSON string; import passes a native array. `AdminEvidenceController` `json_decode`s without checking `json_last_error`, so malformed JSON silently stores `null` metadata, and a `document` row with `metadata = null` renders as "Document contents illegible or corrupted."  
**Fix:** Normalise to one contract (array preferred), or make the backend accept both explicitly with proper error handling.

---

## 12. `json_decode` without `json_last_error` check
**File:** `AdminEvidenceController.php:41` (store), `:81` (update)  
**Impact:** Malformed JSON silently stores `null` metadata. Row renders as "illegible" with no error surfaced to admin.  
**Fix:** `json_decode($validated['metadata'], true); if (json_last_error() !== JSON_ERROR_NONE) → 422.`

---

## 13. 14 hardcoded colour literals in `blocks.css`
**File:** `blocks.css` (e.g. `:394-397` badge colours, `:591` stamp tape `#fdfdfb`, `:688` redaction `#1a1a1a`)  
**Impact:** `themes.css:11-12` states *"A block CSS file must never hardcode a colour."* Those 14 literals ignore the active theme — those elements render identically across all 5 paper themes.  
**Fix:** Replace each with the corresponding `--doc-*` token; if a token doesn't exist, add it to `themes.css`.

---

## 14. Dead `sub_type` column
**File:** `database/migrations/2026_08_19_112215_refactor_evidences_for_json_metadata.php`  
**Impact:** Column added, fully replaced by `metadata.doc`, but column survives. Referenced by no model property, no controller, no frontend code.  
**Fix:** Migration to drop column after verifying no data depends on it (data check first).

---

## 15. Stale comment references to deleted `PlansEvidence.md`
**Files:** 12 live references across 9 files:
- `doc.ts` ×4 (lines 12, 22, 266, 294)
- `blocks.css` (line 10 comment)
- `BlockRenderer.tsx` (line 17)
- `UniversalDocViewer.tsx` (line 20-21)
- `UniversalDocViewer.css` (line 70)
- `WatermarkBlock.tsx` (line 8)
- `ImageBlock.tsx` (line 8)
- `types/evidence/index.ts` (line 15)

Plus `ai_project_context.xml` documents the **entire deleted** `DocumentEvidenceVariants/`, `ForensicViewers/`, and `DocumentViewers/` trees.  
**Impact:** Misleads readers; CI doesn't catch stale docs.  
**Fix:** Delete or update all references; regenerate `ai_project_context.xml` or remove its file-list section.

---

## Bonus: Over-broad `gameCase.evidences` eager load
**File:** `GameRoomController.php:1303`  
**Impact:** Eager-loading `gameCase.evidences` ships every unearned evidence row (including full doc bodies) to every client before filtering. The deleted plan listed this as out-of-scope-but-worth-a-ticket; it remains open.  
**Fix:** Load only `unlockedEvidences` + `is_initial` rows; or add a scope `Evidences::visibleToRoom($room)`.

---

## Severity ordering (for future prioritisation)
| Severity | Items |
|---|---|
| **Critical** | 1 (audio broken), 10 (import bypass), 12 (silent JSON failure) |
| **High** | 2 (theme skins missing), 3 (reordering dead), 4 (nested blocks frozen), 9 (weak normalisation) |
| **Medium** | 5 (toolbar desync), 6 (broken template labels), 8 (duplicate factories), 13 (hardcoded colours) |
| **Low** | 7 (dead code), 11 (dual wire contract), 14 (dead column), 15 (stale docs) |
| **Architectural** | Bonus (over-broad eager load) |

---

## Note on Digital scope
The Digital surface PR already:
- Fixes the normalisation strictness for terminal (defect 9)
- Adds server-side validation for digital (closes defect 10 for the new type)
- Uses the shared `blockFactory` pattern (addresses defect 8 for the new type)
- Has no `sub_type` column (defect 14 doesn't apply)
- Has no template labels yet (defect 6 doesn't apply)

The remaining defects stay in this file until a dedicated fix PR.