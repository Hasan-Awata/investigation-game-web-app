# Investigation Game: Case Authoring & Bulk Import Schema Guide

This document defines the complete JSON structure required to author a case, both through the single-entity admin API and through the bulk case import mechanic (`POST /api/admin/cases/import`).

Two cross-cutting rules govern everything below:

1. **Reference ID (`ref_id`) strategy.** Relationships (a choice unlocking a specific piece of evidence) are declared as `*_ref` / `*_refs` string keys and resolved into real database integer IDs *inside* the import transaction, before the referencing rows are created. See §10.
2. **All-or-nothing.** The bulk import runs in a single database transaction. Any invalid enum, any rejected payload, any unknown key inside a content payload throws → the whole case is rolled back → nothing is created. The single-entity evidence endpoints are **not** transactional in the same way and have their own partial-write behaviour documented in §5.6.

Everything below is validated against the current code. Values that are **not** enforced are explicitly marked as such.

---

## 1. ENUM Validation Dictionary

String values must exactly match the backend enum cases. Invalid values are rejected at the request-validation layer (HTTP 422) on both write paths, so they never reach the database.

| Entity Field | Allowed Values |
| :--- | :--- |
| `presentation_type` (Levels) | `standard`, `interrogation`, `location`, `wiretap` — see §8: only `interrogation`, `location`, `wiretap` are renderable. **Do not use `standard`** |
| `evidence_type` (Evidence) | `document`, `forensic`, `ballistics`, `testimony`, `digital`, `image`, `audio`, `custom` (exactly 8) — see §5.1 |
| `viewer_strategy` (Evidence) | `paper`, `terminal`, `media`, `artifact` (exactly 4) — see §5.2 |
| `paper_finish` (Evidence) | `blank`, `manila` (exactly 2) — **only legal on a `paper` strategy**, see §5.2 |
| `content_payload` block `type` | `text`, `table`, `signature`, `stamp` (exactly 4, **lower snake_case** — the previous PascalCase widget names are gone), see §9 |
| Evidence asset `kind` | `image`, `audio`, `model_3d` (exactly 3) — not authored in JSON; assigned by the upload endpoint, see §2 |
| `request_type` (Investigation Requests) | `search_warrant`, `financial_subpoena`, `toxicology_report`, `wiretap_authorization`, `ballistics_analysis`, `digital_forensics`, `exhumation_order` |
| `default_status` (Characters) / `status` (`character_updates[]`) | `available`, `deceased`, `fled`, `incarcerated` |
| `charge` (Characters) | `murder`, `fraud`, `conspiracy`, `blackmail`, `theft`, `accomplice`, `null` |
| `content_payload.kind` (artifact payload) | `html`, `model_3d` — `model_3d` only when `EVIDENCE_MODEL_3D=true`, see §9.4 |

> **Removed in the current evidence model** — any of these keys inside an evidence object is now an unknown key. There is no `sub_type`, no `metadata`, no `theme`, no top-level `pages`, no `img_url`, no `audio_url`, no `paragraph`. `content_payload` is the single document field, and binary attachments live in `evidence_assets` rows (§2). Unknown keys inside `content_payload` are **rejected**, not ignored (§9.1); unknown keys on the evidence object itself are ignored by the import (only the whitelisted rules in §5.4 are read).

---

## 2. Evidence Media & Asset Protocol

> **CRITICAL:** JSON payloads cannot transmit binary files. Evidence attachments are **never** authored in the case JSON. They are uploaded after creation, one file at a time, through the admin evidence endpoint.

### 2.1 What the importer can and cannot set

| Attachment | Importable? | How it is set |
| :--- | :--- | :--- |
| Evidence image / photo | **No** | `POST /api/admin/evidences` or `PUT`, multipart field `image` |
| Evidence audio clip | **No** | same endpoint, field `audio` |
| Evidence 3D model | **No** | same endpoint, field `model` (gated, see §2.4) |
| Case cover image | **No** | `store_locally` on the case form, post-import |
| Character mugshot | **No** | post-import |
| Level scene image | **No** | post-import — required for `location` levels |
| Question/node image & audio | **No** | post-import — required for the wiretap player |

A `media` evidence is therefore always created in two steps: import (or form) creates the row with `content_payload: null`, then the file is uploaded. Until the upload lands, the player-facing `MediaViewer` renders its "No media attached to this evidence" state.

### 2.2 The `evidence_assets` table

```php
id, evidence_id (FK → evidences, cascade delete), kind, disk, path,
mime (nullable), bytes (nullable), meta (json, nullable), timestamps
UNIQUE (evidence_id, kind)
```

* **At most one asset per kind per evidence**, enforced by the unique index. Re-uploading replaces the file in place (the row is updated, the old file is unlinked only *after* the new row is safely written) — attachments never accumulate as orphans.
* `path` is always `cases/{case_id}/evidences/{uuid}.{ext}` — the original filename is discarded.
* `meta` is populated for images only, as `{"width": int, "height": int}`. Audio and model assets store `null`.
* The read contract exposes each asset twice: as an `assets[]` array and as a kind-keyed `media` lookup (`media.image`, `media.audio`, `media.model_3d`), each `{url, mime, bytes, meta}` or `null`.

### 2.3 Accepted extensions

Uploads are validated by the **client-supplied original extension**, lowercased. There is no `mimes:` rule and no server-side size limit.

| Kind | Accepted extensions |
| :--- | :--- |
| `image` | `jpg`, `jpeg`, `png`, `webp`, `gif` |
| `audio` | `mp3`, `wav`, `ogg`, `m4a`, `aac` |
| `model_3d` | `glb`, `gltf`, `obj` |

The admin form additionally refuses oversized files client-side (image > 4 MB, audio > 10 MB) with a warning, but that is a UX guard only — the server accepts anything that passes the extension check.

> Known rough edge: a bad extension is always reported against the `model` error key, regardless of which field carried the file, so a rejected `.txt` sent as `image` reports under `model`. Read the message, not the key.

### 2.4 The 3D gate

`config('evidence.features.model_3d')` reads `EVIDENCE_MODEL_3D` and defaults to **false**. While it is off:

* uploading a `model` file → 422 `3D evidence is not enabled on this server.`
* a `content_payload` with `kind: "model_3d"` → 422 `3D artifacts are disabled. Set EVIDENCE_MODEL_3D=true to enable them.`

`GET /api/admin/evidence-schema` returns `model_3d_enabled` so the editor can hide the option. Turning the flag on is a config change only — no migration.

### 2.5 Storage disks

`config('evidence.storage')`, per kind: `image_disk`, `audio_disk`, `default_disk` (used for models), all `EVIDENCE_*_DISK` env vars defaulting to `public`. A `cloudinary` disk is addressable by URL rather than by relative path, so its files are never unlinked locally. `EvidenceAsset::url()` returns an absolute URL verbatim, a `public`-disk URL for the public disk, and the raw path otherwise.

---

## 3. The Root Structure

All five root keys are **required and must be present** (empty arrays are allowed for the four entity lists; only `case_details` must be a non-empty object):

```json
{
  "case_details": { ... },
  "evidences": [ ... ],
  "characters": [ ... ],
  "investigation_requests": [ ... ],
  "zones": [ ... ]
}
```

The whole import runs in **one database transaction**. Any error (invalid enum, missing required key, rejected payload, DB constraint) rolls back everything.

---

## 4. Case Details (`case_details`)

Contains the overarching metadata for the entire case.

| Field | Required | Type | Default (importer) | Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `title` | **YES** | string | — | ≤ 255 chars (DB) |
| `story` | **YES** | string | — | |
| `XP_on_solve` | **YES** | integer | — | ≥ 0 |
| `min_player_XP` | no | integer | `0` | |
| `map_url` | no | string \| null | `null` | |
| `max_strikes` | no | integer | `3` | ≥ 1 (admin form enforces; import does not) |
| `rating_stars` | no | number | `5.0` | 0–5, 1 decimal (DB `decimal(3,1)`) |
| `age_rating` | no | string | `"Unrated"` | ≤ 50 chars |
| `estimated_playtime` | no | string \| null | `null` | |
| `difficulty` | no | string | `"Standard"` | ≤ 50 chars (free string, not an enum) |
| `tags` | no | **array** of strings | `[]` | Must be a JSON array (model casts to array) |
| `author_name` | no | string | `"System Admin"` | ≤ 100 chars |
| `is_published` | no | boolean | `false` | |
| `img_url` | — | — | — | **Not importable** (§2) |

```json
"case_details": {
  "title": "Shadows of Mezzeh",
  "story": "A local tech magnate is found dead in a high-rise office...",
  "min_player_XP": 150,
  "XP_on_solve": 500,
  "max_strikes": 3,
  "rating_stars": 4.5,
  "age_rating": "Mature 17+",
  "estimated_playtime": "120 Minutes",
  "difficulty": "Hard",
  "tags": ["Noir", "Cybercrime", "Murder"],
  "author_name": "System Admin",
  "is_published": false
}
```

> Note: the single-entity admin API additionally requires `min_player_XP`, `max_strikes`, `rating_stars`, `age_rating`, `difficulty`, `author_name`, `is_published`. The bulk importer applies the defaults above when they are absent.

---

## 5. Entities (Evidences & Characters)

### 5.1 Evidence — the presentation triple

An evidence is **not** rendered by deriving a viewer from its type. Presentation is *resolved once on write* and *stored*, so two pieces of evidence of the same type can never render differently and the client never reimplements the type matrix.

Every evidence row carries three coordinated columns:

| Column | Role |
| :--- | :--- |
| `evidence_type` | **What it is.** Drives the category, the board thumbnail, and which strategies are legal. Author-supplied, required. |
| `viewer_strategy` | **How it is shown.** Drives the player-facing viewer and the *shape* of `content_payload`. Resolved on write from `evidence_type` when omitted. |
| `paper_finish` | **What stock it is printed on.** Only meaningful for a `paper` strategy. Resolved on write: `manila` for `ballistics`, `blank` otherwise. |

The invariant is enforced in three places, all reading the same `ViewerStrategyLegality` service:

1. **Write path** (import and admin form) — resolves and validates the triple before insert.
2. **Model hook** (`Evidence::saving`) — a last line of defence that throws `IllegalEvidencePresentationException` if a code path bypassed the write path. (It returns early, rather than throwing, if either value is not a cast enum instance.)
3. **Read path** — the payload shape, the finish nullability and the `is_paged` flag are all served from the stored strategy, so the client narrows on a value it can trust.

`EvidenceType` labels (used by the admin type picker and the board registry, one thumbnail component per type): `document` → Written Document, `forensic` → Forensic Report, `ballistics` → Ballistics Analysis, `testimony` → Witness Testimony, `digital` → Digital Forensics, `image` → Photographic Evidence, `audio` → Audio Recording, `custom` → Physical Object.

### 5.2 Type → strategy → finish matrix

This is the complete legality matrix. `default_strategy` is the **first** allowed entry and is what gets stored when `viewer_strategy` is omitted.

| `evidence_type` | Allowed `viewer_strategy` | default | default finish | `is_paged` |
| :--- | :--- | :--- | :--- | :--- |
| `document` | `paper`, `terminal` | `paper` | `blank` | yes |
| `forensic` | `paper`, `terminal` | `paper` | `blank` | yes |
| `testimony` | `paper`, `terminal` | `paper` | `blank` | yes |
| `ballistics` | `paper`, `terminal` | `paper` | **`manila`** | yes |
| `digital` | **`terminal`**, `paper` | `terminal` | `blank` | yes |
| `image` | `media` | `media` | — | no |
| `audio` | `media` | `media` | — | no |
| `custom` | `artifact` | `artifact` | — | no |

The rationale, because the boundaries are not arbitrary:

* `image` / `audio` are only ever a photo or a clip, so they cannot be re-skinned as a document — doing so would strand the media with nowhere to render.
* `custom` means "anything not covered by the built-in types", so it gets the sandboxed artifact surface and nothing else.
* `digital` and the report types get both paper-backed strategies, because "a digital log read as a printed transcript" and "a report scanned from a terminal" are both legitimate authoring choices. Note `digital`'s default is the **terminal**, so an omitted `viewer_strategy` on a `digital` evidence does not give you paper.
* A `paper_finish` on `terminal`, `media` or `artifact` is **invalid state, not a harmless extra** — those presentations have no paper.

The same matrix is served to the admin editor at `GET /api/admin/evidence-schema` under `strategy_rules`, so the form can only ever offer a legal combination.

### 5.3 Evidence field reference

| Field | Required | Type | Default (importer) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `ref_id` | no | string | — | Unique; ≤ 64 chars; required only if referenced elsewhere (§10) |
| `title` | **YES** | string | — | ≤ 255 chars |
| `evidence_type` | **YES** | enum | — | §1, 8 values. Drives everything else |
| `viewer_strategy` | no | enum \| null | first allowed strategy for the type | §5.2. **Illegal combination → 422**, not a silent fallback |
| `paper_finish` | no | enum \| null | `manila` for `ballistics`, else `blank` (paper only) | **Illegal for the resolved strategy → 422** |
| `content_payload` | no | object \| null | `null` | Shape is dictated by `viewer_strategy` — §5.7, §9. **Illegal/absent payload → 422** |
| `description` | no | string \| null | `null` | Import has **no** length cap; the single-entity API caps it (see §5.6) |
| `order_index` | no | integer ≥ 0 | **the array index** in `evidences` | Board order; see the caveat in §5.10 |
| `is_initial` | no | boolean | `false` | On the case file from the start, and usable to file requests immediately |
| `is_vital_for_conviction` | no | boolean | `false` | If `true` and never possessed → the final verdict **auto-fails** the run (§5.9) |

### 5.4 The evidence write pipeline

Both write paths run the same ordered pipeline. Knowing the order tells you exactly which error you get when several things are wrong at once.

**Bulk import** (`AdminCaseController::import`, per evidence, in array order):

1. `evidence_type` is resolved. Guaranteed valid by the request rule `['required', new Enum(EvidenceType::class)]` → an unknown type is a 422 on `evidences.{index}.evidence_type`.
2. If `viewer_strategy` is present (non-null) and illegal for the type → **422** on `evidences.{index}.viewer_strategy`, message `Strategy 'x' cannot present a y.` → transaction rolls back.
3. The strategy is resolved: the requested one if legal, otherwise the type default.
4. If `paper_finish` is present and not legal for the **resolved** strategy → **422** on `evidences.{index}.paper_finish` → transaction rolls back.
5. `content_payload` is validated and normalised by the same `ContentPayloadValidator` the admin form uses (§9). Any problem → **422** and the transaction rolls back.
   * Note the error keys are rooted at `content_payload.*` and **do not include the evidence index**, so a failing payload inside a 40-evidence import reports as `content_payload.pages.2.blocks.0.props.html`. Count back through the `evidences` array to find which row it belongs to.
6. `Evidence::create(...)` fires the model `saving` hook, which re-asserts legality.
7. `ref_id` (if present) is registered in the evidence ref map for later passes.

**Single-entity API** (`AdminEvidenceController::store` / `update`):

1. The presentation triple is resolved and legality-checked **before** `$request->validate()` runs, so an illegal strategy is reported under `viewer_strategy` rather than as a generic validation bag.
2. `validate()`: `case_id` required + must exist; `title` required ≤ 255; `description` nullable with a length cap; `is_initial` **required** boolean; `is_vital_for_conviction` **required** boolean; `order_index` nullable integer ≥ 0; `image`/`audio`/`model` nullable files.
3. Row is written, presentation already resolved.
4. `content_payload` is read **raw** from the input (it is not in the validation rules) and validated. It may arrive as an **array or as a JSON string**; a `null` or empty-string value **clears** the document.
5. Assets: new uploads are written, then `remove_image` / `remove_audio` / `remove_model` are honoured.

### 5.5 Rejected vs. silently corrected

This is the boundary that matters most when a payload does not come back clean.

| Situation | Behaviour |
| :--- | :--- |
| Unknown `evidence_type` / `viewer_strategy` / `paper_finish` value | **Rejected** (422) |
| Legal-but-unusual `viewer_strategy` (e.g. `paper` on a `digital`) | **Accepted** — honoured as written |
| `viewer_strategy` omitted or `null` | **Corrected** to the type default (§5.2) |
| `paper_finish` omitted on a `paper` strategy | **Corrected** to `manila` for `ballistics`, else `blank` |
| `paper_finish` set on a non-`paper` strategy | **Rejected** (422) |
| Unknown key on the evidence object (e.g. `theme`) | **Silently ignored** — not in the whitelist |
| Unknown key inside `content_payload` (root, page, block or props) | **Rejected** (422) — deliberate, so a half-understood document cannot render as a silent blank gap |
| A `select` prop absent or `null` | **Corrected** to the catalog default |
| A `select` prop present but not an allowed option | **Rejected** (422) |
| A `toggle` / `number` prop absent or `null` | **Corrected** to the catalog default |
| A `toggle` prop present but not a boolean | **Rejected** (422) |
| An optional text prop absent or `null` | **Corrected** to `""` |
| A required text prop `null` | **Rejected** (422) |
| `signature_id` absent or `null` | **Rejected** (422) — the only prop with no usable default |
| `signature_id` valid in range but no such file in the catalog | **Rejected** (422) `Signature [n] does not exist.` |
| `rows` in a table with the wrong cell count for its `headers` | **Rejected** (422) |
| `content_payload` on a `media` evidence that is not `null`/`{}` | **Rejected** (422) |
| `content_payload` absent on a `paper`/`terminal` evidence | **Rejected** (422) `The pages property must be an array.` — paged strategies require a real document |
| `content_payload` absent on an `artifact` evidence | **Accepted** — stored empty, reads back as `null`, viewer shows "no content yet" |
| Duplicate page/block `id` inside one evidence | **Rejected** (422) |
| An unknown `*_ref` string anywhere (§10) | **Silently dropped** — the one place silence is the design |

### 5.6 Import vs. single-entity API — the asymmetries

| Concern | Bulk import | Single-entity API |
| :--- | :--- | :--- |
| `is_initial`, `is_vital_for_conviction` | optional, default `false` | **required** booleans |
| `description` length | **uncapped** | capped at `evidence.limits.max_description_bytes` (4096). Note Laravel's `max` on a string counts **characters**, despite the config key saying bytes |
| `content_payload` encoding | must be a real JSON object/array (`nullable\|array`) | array **or** a JSON string (the form stringifies objects) |
| `content_payload` absent | paged strategies fail; `media` → `null`; `artifact` → empty | always treated as "clear the document" |
| `order_index` absent | defaults to the **array index** | `store` writes `0`; `update` preserves the existing value |
| Attachments | impossible | multipart `image` / `audio` / `model` |
| `store_locally` | n/a | **present in the form but never read by the backend** — evidence always writes to the configured disk. It is a dead control |
| `ref_id` | supported | not supported |
| Transaction | whole case, all-or-nothing | **per-request, and not atomic** |

> **Partial-write warning (update).** `AdminEvidenceController::update` saves the row *before* validating the payload, deliberately, so a strategy change cannot leave a payload the viewer cannot render. The consequence is that a **422 from the payload can leave the type, strategy, finish, title and flags already changed** on that row. If an update fails validation, re-read the evidence and re-apply the fields you intended.

> **Authorisation.** There are no policies. Admin access is a single `is_admin` boolean middleware, and the evidence routes bind by id without checking which case the evidence belongs to. Keep admin credentials scoped.

### 5.7 `content_payload` — the three shapes

`viewer_strategy` dictates the payload shape, and the three are **not** interchangeable. The validator dispatches on the stored strategy, so a payload authored for the wrong strategy is rejected outright.

| Strategy | Payload shape | Required? |
| :--- | :--- | :--- |
| `paper`, `terminal` | `{ "pages": [ { "id": "...", "blocks": [ … ] } ] }` | **Yes.** Page breaks are *authored*, never inferred, so the same content paginates identically for every player |
| `artifact` | `{ "kind": "html", "html": "…", "css": "…" }` or `{ "kind": "model_3d", "model_asset_id": 12, "stage_height": 640 }` | No — an unfilled artifact is legal |
| `media` | `null` | **Must be null.** Content lives in the assets |

`paper` and `terminal` share one shape and one block vocabulary; they differ only in chrome (a sheet of stock vs. a CRT window) and in the fact that `paper` carries a finish. Full block reference in §9.

The client mirrors this as a discriminated union keyed on `viewer_strategy`, so `media` evidence *cannot* be typed with a payload, and `paper` evidence *cannot* be typed without a finish — the combinations the server would answer with a 422 are compile errors.

### 5.8 Evidence assets on the read side

`content_payload` is only ever sent by the room-scoped detail route, and only after the room possesses the evidence. Two shapes exist:

**Board entry** (`accumulated_evidences`, in the room load and in Reverb broadcasts) — enough to draw a card and pick a viewer, deliberately **without** the document:

```json
{ "id": 41, "title": "Autopsy Report", "description": null,
  "evidence_type": "forensic", "viewer_strategy": "paper",
  "paper_finish": "blank", "is_initial": false,
  "is_vital_for_conviction": true, "order_index": 3,
  "thumbnail_url": null, "is_paged": true }
```

`thumbnail_url` is the first **image** asset, whatever the strategy — so a `paper` evidence can still have a board thumbnail. `is_paged` is server-derived from the strategy; trust it rather than recomputing it.

**Detail entry** (`GET /api/rooms/{room}/evidences/{evidence}`) — adds the document:

```json
{ "id": 41, "title": "…", "description": "…",
  "evidence_type": "forensic", "viewer_strategy": "paper",
  "paper_finish": "blank", "is_vital_for_conviction": true,
  "content_payload": { "pages": [ … ] },
  "assets": [ { "kind": "image", "url": "…", "mime": "image/jpeg", "bytes": 81234, "meta": { "width": 1600, "height": 1200 } } ],
  "media": { "image": { "url": "…", "mime": "…", "bytes": 0, "meta": null },
             "audio": null, "model_3d": null },
  "signature_paths": { "1": "/assets/signatures/signature-1.svg", "2": "…" } }
```

An empty stored payload is normalised to `null` on read for every strategy, so clients never receive `{}` where the contract says `null`.

### 5.9 How evidence is integrated at runtime

Evidence is a **case child**, not a level child. The old `level_id` foreign key is gone; there is no level↔evidence relationship at all, and no character↔evidence relationship. Integration is entirely via the room:

* **Possession = `is_initial` OR a `room_evidences` row.** A room's board shows the union.
* **Three grant paths:**
  1. `is_initial: true` — on the file from the start.
  2. A choice outcome: `unlock_evidence_refs` → stored as `outcomes.unlock_evidence`; applied on vote lock-in.
  3. A request reward: `unlocks_evidence_ref` → `investigation_requests.unlocks_evidence_id`; inserted on approval.
* **Filing a request** requires the submitted evidence set to be **exactly equal** (sorted) to the request's required set, and every submitted id must be one the room possesses. Extra evidence fails the filing. Requests can only be filed once per room.
* **Gating a choice** on evidence: `requirements.required_evidence_refs` → `required_evidence`; the choice stays locked until the room possesses **all** of them.
* **Vital evidence** is checked at the final verdict: if any `is_vital_for_conviction` evidence was never possessed, the case fails immediately regardless of the characters submitted. **Every vital evidence must be obtainable** — either `is_initial: true`, granted by a reachable choice, or the reward of a satisfiable request. An unreachable vital evidence makes the case unwinnable by construction.
* **Detail authorisation:** 403 if the caller is not a member of the room; 404 if the evidence belongs to another case; 404 if the room has not unlocked it. Both 404s are deliberate, so the route cannot be used to enumerate a case's evidence.
* **Broadcasts** (`ItemsUnlocked`) carry board entries, not documents, so a long report is never duplicated into every client's memory.

### 5.10 `order_index` and board order

`order_index` is an author-defined board position (it replaced an old `index % 5` rotation). The import defaults it to the evidence's **position in the `evidences` array**, so the order you author in is the order you get.

`Evidence::scopeOrdered()` exists (`order_index`, then `id`) but is **not called by the room query today**, so the board currently renders in database id order, which for an import is the same as array order. Treat `order_index` as recorded-but-not-yet-honoured and do not rely on reordering an existing case to reshuffle its board.

### 5.11 Known limitation: `is_initial` evidence is not inspectable

The board query includes `is_initial` evidence, but the detail route authorises **only** against the `room_evidences` pivot, and nothing ever inserts initial evidence into that pivot. An `is_initial: true` evidence therefore shows a card on the board whose detail request returns **404 "This evidence has not been added to your case file."**

Practical authoring rule: **do not rely on `is_initial: true` for anything a player must read.** Use it for context cards, and grant every readable evidence through a choice or a request reward. (The admin form defaults this checkbox to on, so watch it.)

### 5.12 Worked examples

**A `media` photo** — no payload, file uploaded separately:

```json
{
  "ref_id": "ev_cctv_01",
  "title": "Alleyway CCTV Still",
  "description": "Grainy frame of a figure leaving the loading bay.",
  "evidence_type": "image",
  "is_initial": false,
  "is_vital_for_conviction": false
}
```

**A `paper` forensic report** — strategy and finish omitted and resolved for you (`paper`, `blank`):

```json
{
  "ref_id": "ev_autopsy_01",
  "title": "Autopsy Report — Case D-2026-89",
  "description": "Blunt force trauma. Blue synthetic fibre in the wound.",
  "evidence_type": "forensic",
  "is_initial": true,
  "is_vital_for_conviction": true,
  "content_payload": {
    "pages": [
      {
        "id": "p1",
        "blocks": [
          { "id": "b1", "type": "text",
            "props": { "html": "<p><strong>MEZR — DAMASCUS FORENSIC</strong></p><p>Cause of death: blunt force trauma.</p>",
                       "align": "left", "size": "body" } },
          { "id": "b2", "type": "table",
            "props": { "headers": ["Item", "Finding"],
                       "rows": [["Fibre", "Blue synthetic, industrial"], ["Time of death", "22:00–23:30"]],
                       "caption": "Table 1 — Summary", "dense": false } },
          { "id": "b3", "type": "stamp",
            "props": { "text": "CONFIDENTIAL", "variant": "red", "rotation": -8, "font_size": "auto" } }
        ]
      }
    ]
  }
}
```

**A `terminal` digital log** — `digital` defaults to `terminal`, so `viewer_strategy` may be stated or omitted; `paper_finish` must be absent or `null`:

```json
{
  "ref_id": "ev_laptop_01",
  "title": "Recovered Shell History",
  "evidence_type": "digital",
  "viewer_strategy": "terminal",
  "paper_finish": null,
  "content_payload": {
    "pages": [
      { "id": "p1", "blocks": [
        { "id": "b1", "type": "text",
          "props": { "html": "<pre>$ history | tail -20</pre>", "align": "left", "size": "small" } }
      ] }
    ]
  }
}
```

**A `ballistics` report** — defaults to `paper` + `manila`, and a signed chain of custody:

```json
{
  "ref_id": "ev_ballistics_01",
  "title": "Firearms Examination",
  "evidence_type": "ballistics",
  "content_payload": {
    "pages": [
      { "id": "p1", "blocks": [
        { "id": "b1", "type": "signature", "props": { "signature_id": 4, "label": "Ballistics Examiner", "verified": true } }
      ] }
    ]
  }
}
```

> `signature_id` **must** come from `GET /api/admin/signatures`. Ids are assigned positionally from the natural-sorted filenames in `public/assets/signatures`, so adding or removing an SVG shifts every later id. Never hard-code one; a stale id fails validation with `Signature [n] does not exist.`

**A `custom` physical object** — the only strategy that takes artifact markup:

```json
{
  "ref_id": "ev_knife_01",
  "title": "Recovered Blade",
  "evidence_type": "custom",
  "content_payload": {
    "kind": "html",
    "html": "<div class=\"tag\"><h2>EVIDENCE TAG</h2><p>Item 14 &mdash; recovered from scene.</p></div>",
    "css": ".tag { font-family: monospace; color: #b00; }"
  }
}
```

**An illegal combination** — rejected, and the whole import rolls back:

```json
{ "title": "Photo of the wound", "evidence_type": "image", "viewer_strategy": "paper" }
```
→ `422 Strategy 'paper' cannot present a image.`

**A finish on a non-paper strategy** — also rejected:

```json
{ "title": "Terminal dump", "evidence_type": "digital", "viewer_strategy": "terminal", "paper_finish": "manila" }
```
→ `422 Finish 'manila' is not valid for a terminal presentation.`

### 5.13 Characters (Unified Persons of Interest)

Characters replace the old Victim and Suspect paradigms. The backend only tracks the absolute truth, leaving deduction to the players.

| Field | Required | Type | Default (importer) |
| :--- | :--- | :--- | :--- |
| `name` | **YES** | string | — (≤ 255 chars) |
| `background` | no | string \| null | `null` |
| `is_initial` | no | boolean | `false` (visible on the case file from the start) |
| `is_guilty` | no | boolean | `false` |
| `charge` | no | enum \| null | `null` (§1; `null` allowed for non-guilty/victims) |
| `default_status` | no | enum | `"available"` (§1) |
| `ref_id` | no | string | — (required if referenced by `character_updates`) |

```json
"characters": [
  {
    "ref_id": "char_karam",
    "name": "Karam Al-Din",
    "background": "Rival CEO with a history of corporate espionage.",
    "is_initial": true,
    "is_guilty": true,
    "charge": "murder",
    "default_status": "available"
  },
  {
    "ref_id": "char_john",
    "name": "John Doe",
    "background": "Tech magnate and philanthropist.",
    "is_initial": true,
    "is_guilty": false,
    "charge": null,
    "default_status": "deceased"
  }
]
```

---

## 6. Investigation Requests (`investigation_requests`)

Procedural requests filed to the DA or Judge. They use `ref_id` strings to point to the required and rewarded items.

| Field | Required | Type | Notes |
| :--- | :--- | :--- | :--- |
| `request_type` | **YES** | enum | §1 |
| `required_evidence_refs` | no (strongly recommended) | string[] | refs → `evidences[].ref_id`. **At least 2** — filing a request requires selecting ≥2 evidence IDs, so a request demanding fewer can never be fulfilled |
| `unlocks_evidence_ref` | no (recommended) | string \| null | refs → `evidences[].ref_id`. The reward is what makes a vital evidence reachable (§5.9) |
| `unlocks_level_ref` | no (recommended) | string \| null | refs → `zones[].levels[].ref_id` |
| `ref_id` | no | string | (required if a level’s `required_request_ref` points to it) |

> The single-entity API enforces `required_evidence_ids: min:2` and at least one unlock; the **bulk importer does not enforce either** — it is a design rule you must follow yourself. At least one unlock (`unlocks_evidence_ref` or `unlocks_level_ref`) is strongly recommended: a request with no reward is a dead end.

```json
"investigation_requests": [
  {
    "ref_id": "req_search_karam",
    "request_type": "search_warrant",
    "required_evidence_refs": ["ev_autopsy_01", "ev_financial_01"],
    "unlocks_evidence_ref": "ev_murder_weapon",
    "unlocks_level_ref": null
  }
]
```

**Runtime rule:** filing succeeds only when the set of evidence IDs the player submits is **exactly equal** to the request’s required set (sorted set-equality in `InvestigationRequestService`). The listed evidences *are* the combination — extra or missing evidence fails the filing, and every submitted id must be one the room already possesses. A completed request cannot be re-filed.

---

## 7. Zones & Levels (`zones`)

The core geographical hub. A Zone contains an array of levels (leads/encounters), and a Level contains an array of nodes (the logic/questions).

**Zones**

| Field | Required | Type | Default | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `title` | **YES** | string | — | ≤ 255 chars |
| `order_index` | **YES** | integer | — | ≥ 1 recommended (admin form enforces ≥ 1; import does not) |
| `levels` | **YES** | array | — | key must exist (may be `[]`) |
| `description` | no | string \| null | `null` | |
| `map_url` | no | string \| null | `null` | |
| `coord_x` / `coord_y` | no | number \| null | `null` | Provide **both or neither** (admin form rule); import accepts nulls |

**Levels**

| Field | Required | Type | Default | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `title` | **YES** | string | — | ≤ 255 chars |
| `details` | **YES** | string | — | key must exist |
| `order_index` | **YES** | integer | — | ≥ 1 recommended |
| `presentation_type` | **YES** | enum | — | §1; only `interrogation` / `location` / `wiretap` render (§8) |
| `nodes` | no | array | `[]` | |
| `is_initial` | no | boolean | `false` | If `false`, the level stays hidden until unlocked via a choice (`unlock_levels_refs`) or a request (`unlocks_level_ref`). **At least one level must be `is_initial: true`** or players start with nothing playable |
| `required_request_ref` | no | string \| null | `null` | refs → `investigation_requests[].ref_id`. The level stays gated until that request is completed |
| `ref_id` | no | string | — | required if referenced by `unlock_levels_refs` / `unlocks_level_ref` |
| `img_url` | — | — | — | **Not importable** — required for `location` scenes (§2) |

```json
"zones": [
  {
    "title": "Zone 1: Industrial District",
    "description": "A perimeter sweep of the warehouses.",
    "order_index": 1,
    "map_url": "/tactical-damascus-blueprint.png",
    "coord_x": 45.5,
    "coord_y": 60.2,
    "levels": [
      {
        "ref_id": "lvl_interrogation_karam",
        "title": "Warehouse Office",
        "details": "Question the prime suspect on site.",
        "order_index": 1,
        "is_initial": true,
        "presentation_type": "interrogation",
        "required_request_ref": null,
        "nodes": [ ... ]
      }
    ]
  }
]
```

---

## 8. Level Logic (`nodes`)

Each node = one question. Node `text` is the narration/suspect line; `choices` are the player’s options. `choices` key must exist on every node (may be `[]`).

| Field | Required | Notes |
| :--- | :--- | :--- |
| `text` | **YES** | node text column is `text` (unlimited practical length) |
| `choices` | **YES** | array, may be `[]` (a node with no choices is a terminal/dead-end node) |

**Choice fields**

| Field | Required | Notes |
| :--- | :--- | :--- |
| `text` | **YES** | **≤ 255 chars** — DB column is `varchar(255)` (the single-entity API enforces `max:255`; the importer does not, so oversized text rolls back the transaction) |
| `outcomes` | no | object, default none — see below |
| `requirements` | no | object, default none — see below |
| `ref_id` | no | required if referenced by any `required_choice_refs` — **see ref ordering rules in §10** |

The `nodes` array adapts based on the level's `presentation_type`.

> **`standard` levels are not playable.** `CampaignTab` only has render branches for `interrogation`, `location`, and `wiretap` — a `standard` level shows nothing. The value exists in the enum but must not be authored.

### Type A: Interrogation (`interrogation`)

**Instructional Note:** Interrogation levels are the core narrative engines of the game. Because the system relies on an objective source-of-truth narrative with variable player verdicts (rather than floating, user-specific stories), these interrogation trees must be deep and diverse. Ensure branching dialogue paths reflect different investigator tactics (e.g., aggressive pressing, empathetic listening, or direct evidence presentation). Linear, shallow dialogue trees will break the immersion of the overarching investigation. Use `required_choice_refs` to gate deeper questions behind specific prior dialogue selections.

*   `text`: Represents the **suspect's dialogue** (or action/silence).
*   `choices`: Represents the **investigator's tactics, statements, or questions**.

```json
"nodes": [
  {
    "text": "[Suspect avoids eye contact] 'I was nowhere near the building on the night of the 14th.'",
    "choices": [
      {
        "ref_id": "choice_alibi_push",
        "text": "Present the CCTV still placing him at the scene.",
        "outcomes": {
          "feedback": "He stammers, realizing he's caught in a lie. He agrees to talk.",
          "gives_strike": false,
          "next_question_index": 1,
          "unlock_evidence_refs": [],
          "character_updates": [
            { "ref_id": "char_accomplice", "is_unlocked": true }
          ]
        },
        "requirements": {
          "required_evidence_refs": ["ev_cctv_01"]
        }
      },
      {
        "text": "Accuse him directly of pulling the trigger.",
        "outcomes": {
          "feedback": "He slams his hand on the table and demands a lawyer. You pushed too hard without proof.",
          "gives_strike": true,
          "next_question_index": null
        }
      }
    ]
  },
  {
    "text": "[Suspect slumps in his chair] 'Fine. I was there, but I didn't kill him. I was just the driver.'",
    "choices": [
      {
        "ref_id": "choice_accomplice_push",
        "text": "Who pulled the trigger?",
        "outcomes": {
          "feedback": "He gives you a name.",
          "gives_strike": false,
          "next_question_index": null
        },
        "requirements": {
          "required_choice_refs": ["choice_alibi_push"]
        }
      }
    ]
  }
]
```

### Type B: Location (`location`)

Nodes represent individual visual scenes to inspect. Each choice’s `text` **must** follow the exact format:

```
X, Y | Title
```

*   `X` and `Y` are **percentages** (0–100) of the scene image, separated by a comma, then a space-padded `|` separator, then the tooltip title.
*   The point is rendered as `top: Y%`, `left: X%` on the scene image.
*   **Any other format → the point silently does not render** (the component bails out when it cannot split on `|` and `,`).

```json
"nodes": [
  {
    "text": "Main Office Layout",
    "choices": [
      {
        "ref_id": "loc_laptop",
        "text": "45.2, 78.5 | Smashed Laptop",
        "outcomes": {
          "feedback": "The hard drive is missing. We should file a Digital Forensics request.",
          "gives_strike": false,
          "unlock_evidence_refs": ["ev_broken_laptop"]
        }
      },
      {
        "text": "12.1, 90.0 | Coffee Mug",
        "outcomes": {
          "feedback": "Just cold coffee. Nothing of interest here.",
          "gives_strike": false
        }
      }
    ]
  }
]
```

A choice counts as a **correct find** (not a dead end) only if it has at least one unlock outcome (`next_question_id`, `unlock_evidence`, `unlock_levels`, `unlock_suspects`, `unlock_victims`). Choices with only `feedback`/`gives_strike` are dead ends. The scene image comes from the node’s `img_url` (not importable — §2).

### Type C: Wiretap (`wiretap`)

The node `text` is the transcript of the intercepted call. The playable audio comes from the node’s `audio_url` (not importable — §2); without it the UI falls back to reading the transcript.

```json
"nodes": [
  {
    "text": "UNKNOWN MALE 1: 'The package is secured. Is the heat off?'\nUNKNOWN MALE 2: 'For now. Burn the documents.'",
    "choices": [
      {
        "ref_id": "wiretap_deduction_1",
        "text": "Deduction: The suspects are destroying financial evidence.",
        "outcomes": {
          "feedback": "Correct deduction. Logging interpretation.",
          "unlock_levels_refs": ["lvl_warehouse_raid"]
        }
      },
      {
        "text": "Deduction: The suspects are talking about a kidnapping.",
        "outcomes": {
          "feedback": "Incorrect deduction. That does not align with the profile.",
          "gives_strike": true
        }
      }
    ]
  }
]
```

> There is **no ≥2-choices validation** on wiretap nodes anywhere in the code. Multiple choices are still a design recommendation so players actually have something to vote on.

### Choice `outcomes` (import keys → runtime keys)

The importer whitelists keys — **unknown outcome keys are silently dropped**. Use these exact import-side names:

| Import key | Runtime key | Type | Behavior |
| :--- | :--- | :--- | :--- |
| `feedback` | `feedback` | string | Global feedback toast after voting |
| `gives_strike` | `gives_strike` | boolean | Increments room strikes; reaching `max_strikes` fails the run |
| `next_question_index` | `next_question_id` | integer \| null | **0-based index into the same level’s `nodes` array.** Out-of-range index → stored as `null` (treated as terminal). `null`/omitted → no jump |
| `unlock_evidence_refs` | `unlock_evidence` | string[] | Unknown refs silently dropped (§10) |
| `unlock_levels_refs` | `unlock_levels` | string[] | Unknown refs silently dropped (§10) |
| `character_updates` | `character_updates` | array | See below |

`character_updates[]` entry (import keys → runtime keys):

| Import key | Runtime key | Type | Notes |
| :--- | :--- | :--- | :--- |
| `ref_id` | `id` | string → int | **Required.** Unknown ref → entry silently dropped |
| `is_unlocked` | `is_unlocked` | boolean | `true` reveals the character on the case file |
| `status` | `status` | enum | §1 (`available`, `deceased`, `fled`, `incarcerated`) |

### Choice `requirements` (import keys → runtime keys)

| Import key | Runtime key | Type | Behavior |
| :--- | :--- | :--- | :--- |
| `required_evidence_refs` | `required_evidence` | string[] | The choice stays locked (greyed/hidden) until the player possesses **all** referenced evidences |
| `required_choice_refs` | `required_choices` | string[] | Locked until the player has voted for **all** referenced choices. **Backward refs only — see §10** |

---

## 9. Evidence Content Payload Reference (`content_payload`)

The single authority for every rule below is `BlockCatalog`, which is read by three consumers that therefore cannot drift: the validator (which turns the descriptors into 422 errors), `GET /api/admin/evidence-schema` (which feeds the block editor), and the evidence factory.

### 9.1 Shape and rejection rules

```
content_payload                (object; only the key `pages` is allowed)
└─ pages                       (list, 1 … 20 entries)
   └─ id                       (string, 1 … 64 chars, unique within the evidence)
   └─ blocks                   (list, 0 … 40 entries)
      ├─ id                    (string, 1 … 64 chars, unique within the evidence)
      ├─ type                  (one of: text, table, signature, stamp)
      └─ props                 (object; only the keys listed for that type)
```

Three rules that are easy to get wrong:

1. **Unknown keys are rejected, everywhere.** At the payload root, on a page, on a block and inside `props`. Error shape: `Unknown property [x]; expected one of: a, b, c.` A payload that survives half-understood would render as a blank gap with no way for the player to tell something was lost, so nothing is dropped quietly.
2. **Page and block ids share one namespace.** The uniqueness check is per *evidence*, not per level of nesting, so a page and a block may not use the same id.
3. **Page breaks are authored.** Pagination is never inferred from content length, so the same evidence paginates identically for every player.

Errors are reported as a Laravel validation bag keyed by **dotted path**, e.g. `content_payload.pages.0.blocks.2.props.rows.1.3`. Under the bulk import these keys are *not* prefixed with the evidence index (§5.4, step 5).

### 9.2 Hard limits

| Limit | Value | Config key |
| :--- | :--- | :--- |
| Pages per evidence | 20 | `evidence.limits.max_pages` |
| Blocks per page | 40 | `evidence.limits.max_blocks_per_page` |
| Table rows | 200 | `evidence.limits.max_table_rows` |
| Table columns (headers, and cells per row) | 20 | `evidence.limits.max_table_columns` |
| `text` block `html` | 65 536 **bytes** | `evidence.limits.max_text_html_bytes` |
| Artifact `html` | 262 144 **bytes** | `evidence.limits.max_artifact_html_bytes` |
| Artifact `css` | 65 536 **bytes** | `evidence.limits.max_artifact_css_bytes` |
| `description` (single-entity API only) | 4096 **characters** | `evidence.limits.max_description_bytes` |
| `stamp` block `text` | 512 **bytes** | hard-coded in the catalog |

Note the deliberate split: block-level ceilings are measured with `strlen()` (real bytes), while the description rule is Laravel's `max:` on a string, which counts characters. The config key name says "bytes" in both cases; only the block limits are.

### 9.3 Block prop reference (4 blocks)

**Every block is legal on every evidence type and every strategy that pages.** Presentation is the only per-type variation, and that is expressed by the payload *shape*, never by the block catalog. There is no per-type block matrix to reproduce.

**`text`** — labelled "Prose"

| Prop | Type | Required | Absent value | Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `html` | string | **yes** | — | non-empty after trim, ≤ 65 536 bytes, sanitized (§9.5), and must still have content afterwards |
| `align` | `left` \| `center` \| `right` \| `justify` | yes | `left` | an explicit value outside the set is rejected |
| `size` | `small` \| `body` \| `lead` \| `heading` | yes | `body` | as above |

**`table`**

| Prop | Type | Required | Absent value | Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `headers` | `string[]` | **yes** | — | a JSON **array** (a comma-separated string is rejected), at least 1 entry, at most 20, every entry a string |
| `rows` | `string[][]` | **yes** | — | at most 200 rows; every row a list of strings; **each row must have exactly `count(headers)` cells**; at most 20 cells per row |
| `caption` | string | no | `""` | no length cap |
| `dense` | boolean | yes | `false` | compact row styling |

The per-row length check is derived from the **submitted** `headers`, so if `headers` itself is missing or malformed the row-length check is skipped — but `headers` is required, so the payload still fails.

**`signature`**

| Prop | Type | Required | Absent value | Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `signature_id` | integer | **yes** | — | ≥ 1, and must exist in the signature catalog. Accepts a digit string. **Ids are positional and shift** — always read them from `GET /api/admin/signatures` |
| `label` | string | no | `""` | rendered as the pad's alt text and caption; falls back to `Signature #n` |
| `verified` | boolean | yes | `false` | `true` → `VERIFIED` badge, `false` → `FORGED` |

A signature id with no matching file still renders (the pad shows a `MISSING` placeholder), but you cannot *save* one — validation rejects it.

**`stamp`**

| Prop | Type | Required | Absent value | Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `text` | string | **yes** | — | non-empty after trim, ≤ 512 bytes |
| `variant` | `red` \| `blue` \| `black` | yes | `red` | an explicit value outside the set is rejected |
| `rotation` | number | yes | `-8` | −45 … 45 inclusive |
| `font_size` | `auto` \| `small` \| `medium` \| `large` | yes | `auto` | an explicit value outside the set is rejected |

### 9.4 Artifact payloads (`artifact` strategy, i.e. `custom` type only)

**`kind: "html"`** — author-authored HTML plus an optional stylesheet. Keys allowed: `kind`, `html`, `css`.

| Field | Required | Notes |
| :--- | :--- | :--- |
| `html` | **yes** | non-empty after trim, ≤ 262 144 bytes, sanitized (§9.5) |
| `css` | no | a string; absent or `null` becomes `""`; ≤ 65 536 bytes; **reject-don't-rewrite** CSS policy (§9.6) |

**`kind: "model_3d"`** — only when `EVIDENCE_MODEL_3D=true`. Keys allowed: `kind`, `model_asset_id`, `stage_height`.

| Field | Required | Notes |
| :--- | :--- | :--- |
| `model_asset_id` | **yes** | integer or digit string. Checked for *shape only* — it is **not** verified against an existing `evidence_assets` row, so a dangling id stores cleanly and the viewer shows "3D artifacts are not enabled." |
| `stage_height` | no | number, 120 … 2000, default 640 |

`kind` is mandatory. Absent → `An artifact payload must declare kind: html or model_3d.` Unrecognised → `Unknown artifact kind [x]; expected one of: …`.

**Rendering boundary:** an artifact is mounted in an `<iframe srcDoc sandbox="allow-scripts" referrerPolicy="no-referrer">`. The absence of `allow-same-origin` is the load-bearing part — with it, the frame could reach the player's cookies and session. `allow-scripts` stays on because an artifact is allowed to script itself, just not to touch the host document.

### 9.5 `text` block sanitization

The `text` block's `html` is cleaned with HTMLPurifier on **write**, and again with DOMPurify on **read**, so a sanitizer bypass or a direct column write cannot become script execution in a player's browser.

* **Allowed tags:** `p`, `br`, `hr`, `strong`, `b`, `em`, `i`, `u`, `s`, `del`, `ins`, `ul`, `ol`, `li`, `h1`–`h6`, `blockquote`, `pre`, `code`, `kbd`, `samp`, `var`, plus `span` / `div` / `p` with a `style` attribute.
* **Forbidden outright:** `script`, `style`, `iframe`, `object`, `embed`, `form`, `input`, `button`, `link`, `meta`, `base`, `svg`, `math`, `audio`, `video`, `source`, `track`.
* **Notably absent: `a` and `img`.** Evidence prose is not a link farm, and an inline image would duplicate what the asset system already owns.
* **Inline CSS is limited to** `text-align`, `font-weight`, `font-style`, `text-decoration` — the block's own `align` prop must not be usable to smuggle in positioning or sizing.
* Comments, element IDs and `target="_blank"` are all disabled.

### 9.6 Artifact sanitization and the CSS deny-list

The artifact is a standalone document rather than a page fragment, so it gets a wider allow-list: tables, `dl`/`dt`/`dd`, `section`/`article`/`header`/`footer`, `mark`, `sub`/`sup`, `blockquote[cite]`. `figure`/`figcaption` are deliberately **not** allowed — Purifier empties their text content, which would silently drop prose; use a classed `div` instead. `a`, `map`, `area`, `canvas` and all form/media elements are forbidden.

Inline CSS allows a much larger set (typography, box model, borders, `float`/`clear`, …) and additionally *forbids* `background`, `background-image`, `list-style-image`, `border-image`, `content`, `cursor`, `transform`, `opacity`, so an artifact cannot reach outside its sandbox or reach the page behind it.

The separate `css` stylesheet is **not** rewritten — it is checked against a deny-list and rejected wholesale. There is no CSS parser in PHP, so rather than pretend to validate a grammar, the constructs that turn a stylesheet into a request forger are refused:

| Rule name | Rejects |
| :--- | :--- |
| `external_fetch` | `url(` — exfiltrate evidence, or beacon |
| `external_import` | `@import` |
| `legacy_expression` | `expression(` — legacy IE script execution |
| `script_url` | `javascript:` / `vbscript:` / `livescript:` |
| `data_url` | `data:` |
| `legacy_behavior` | `behavior:` |
| `moz_binding` | `-moz-binding` |
| `progid_filter` | `progid:` |
| `escaped_identifier` | `\` — CSS escapes spell `url` as `\75 rl` |
| `comment` | `/*` and `*/` — split tokens to hide the above |
| `style_breakout` | `</` — close the host `<style>` element |

The remaining stylesheet is still untrusted, which is exactly why the iframe sandbox (not this list) is what contains it.

### 9.7 Rendering rules, per strategy

* The viewer is chosen by the **stored** `viewer_strategy`, never derived from the type. A file is never rendered as a medium it was not stored as.
* Each strategy's viewer accepts only the payload variant its strategy is allowed to carry, so a mismatch is a compile error on the client rather than a rendering bug. A paged evidence whose payload fails the client-side structural check shows "This file could not be read."
* Pagination controls appear only when `pages.length > 1`, and the page index is per document — reopening a different evidence never lands on the previous document's page.
* Each block is wrapped in its own error boundary, so one malformed block shows "This block could not be displayed." and the rest of the page still renders.
* `paper` reads its stock from `data-finish`; a paper evidence with no finish recorded still gets the blank palette rather than undefined tokens.
* A `table` block with zero rows renders only its empty message — the headers are not drawn.
* A `media` evidence with no asset renders "No media attached to this evidence."

---

## 10. Reference ID (`ref_id`) Mapping & Silent-Failure Rules

Inside the transaction, all `*_ref` / `*_refs` string keys are replaced with real database integer IDs. **All reference resolution is silent**: a typo or unknown ref never errors — it is dropped/nullified and the import still succeeds. Always double-check ref spellings.

| Import key | Resolves against |
| :--- | :--- |
| `case_details` — (no refs) | — |
| `evidences[].ref_id` | defined here |
| `characters[].ref_id` | defined here |
| `investigation_requests[].ref_id` | defined here |
| `zones[].levels[].ref_id` | defined here |
| `zones[].levels[].required_request_ref` | `investigation_requests[].ref_id` (unknown → stored `null`; level ungated) |
| `investigation_requests[].required_evidence_refs[]` | `evidences[].ref_id` (unknown → dropped from set) |
| `investigation_requests[].unlocks_evidence_ref` | `evidences[].ref_id` (unknown → `null`) |
| `investigation_requests[].unlocks_level_ref` | `zones[].levels[].ref_id` (unknown → `null`) |
| `nodes[].choices[].ref_id` | defined here (needed for `required_choice_refs`) |
| `outcomes.unlock_evidence_refs[]` | `evidences[].ref_id` (unknown → dropped) |
| `outcomes.unlock_levels_refs[]` | `zones[].levels[].ref_id` (unknown → dropped) |
| `outcomes.character_updates[].ref_id` | `characters[].ref_id` (unknown → **whole update entry dropped**) |
| `requirements.required_evidence_refs[]` | `evidences[].ref_id` (unknown → dropped) |
| `requirements.required_choice_refs[]` | `zones[].levels[].nodes[].choices[].ref_id` (unknown → dropped; see ordering rule below) |

> Note the asymmetry that makes evidence authoring risky: an unknown `ref_id` is silent, but a **vital** evidence that ends up unreachable because a choice's `unlock_evidence_refs` was misspelled is not detected anywhere. The only symptom is a case that can never be won. Cross-check every vital evidence by hand.

**Hard rules:**

1.  **Duplicate `ref_id`s:** last definition wins for all references (the earlier entity still exists but becomes unreachable by ref). Keep refs unique. `evidences[].ref_id` is capped at 64 characters.
2.  **Choice-ref ordering (`required_choice_refs`):** choices are created in document order — zone by zone, level by level, node by node, choice by choice — and each ref is registered the moment its choice is created. A choice may only reference choices **created earlier in that order** (a previous choice in the same node, or any choice in an earlier node/level). **Forward references are silently dropped.**
3.  **Outcome whitelisting:** only the keys in §8 survive the import. Runtime-shaped keys (`next_question_id`, `unlock_evidence`, `required_evidence`, …) are silently ignored — always use import-side names (`next_question_index`, `unlock_evidence_refs`, `required_evidence_refs`, …).
4.  **`next_question_index` is 0-based within the same level only** — there is no cross-level jump; use `unlock_levels_refs` for level unlocks.
5.  **Node `choices` and zone `levels` keys must exist** (arrays can be empty); every other “Required” field above is accessed without a fallback and will error (rolling back the import) if missing.
6.  **`content_payload` is not a ref surface.** There are no cross-references inside a payload: a `signature` block resolves its file through the id map the server sends with the document, and a `model_3d` block names a raw `evidence_assets` id, not a `ref_id`.
