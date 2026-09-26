# Investigation Game: Bulk Import JSON Schema Guide

This document defines the complete JSON structure required for the bulk case import mechanic (`POST /admin/cases/import`). The system uses a **Reference ID (`ref_id`)** strategy to build relationships (like a choice unlocking a specific piece of evidence) before database IDs exist.

Everything below is validated strictly against the current code. Values that are **not enforced by the importer** are explicitly marked as such.

---

## 1. ENUM Validation Dictionary

To prevent database rollback during the transaction, string values must strictly match the backend definitions and they must be in lower case. Invalid enum values throw inside the Eloquent enum cast → transaction rolls back → HTTP 500.

| Entity Field | Allowed Values |
| :--- | :--- |
| `presentation_type` (Levels) | `standard`, `interrogation`, `location`, `wiretap` — see §8: only `interrogation`, `location`, `wiretap` are renderable. **Do not use `standard`** |
| `evidence_type` (Evidence) | `document`, `forensic`, `testimony`, `image`, `audio`, `digital`, `ballistics` (exactly 7) |
| `request_type` (Investigation Requests) | `search_warrant`, `financial_subpoena`, `toxicology_report`, `wiretap_authorization`, `ballistics_analysis`, `digital_forensics`, `exhumation_order` |
| `default_status` (Characters) / `status` (`character_updates[]`) | `available`, `deceased`, `fled`, `incarcerated` |
| `charge` (Characters) | `murder`, `fraud`, `conspiracy`, `blackmail`, `theft`, `accomplice`, `null` |
| `type` (Widget blocks, §9) | `DataGrid`, `SignaturePad`, `TextParagraph`, `RawHtml`, `KeyValueGrid`, `CalloutBox`, `StampOverlay`, `Barcode`, `TranscriptLog`, `AutopsyDiagram`, `SpectralGraph`, `DnaBands`, `TerminalBlock` (exact PascalCase) |

---

## 2. Post-Import Media Protocol

> **CRITICAL NOTE:** JSON payloads cannot transmit raw binary files. After a successful bulk import, media uploads must be done through the React entity dashboards (Case cover, Characters, Levels, Questions/Wiretaps) so `MediaService` can hash and store assets.

**What the importer CAN set (string URLs only):**

*   `case_details.map_url`
*   `zones[].map_url`
*   `evidences[].img_url` (used by `image` evidence — see §5)
*   `evidences[].audio_url` (used by `audio` evidence — see §5)

**What the importer CANNOT set (upload required post-import):**

*   Case cover image (`img_url`)
*   Character mugshot (`img_url`)
*   Level scene image (`img_url`)
*   Question/node image (`img_url`) — **required for `location` levels to show a scene** (falls back to `/placeholder-crime-scene.jpg`)
*   Question/node audio (`audio_url`) — **required for the wiretap player** (without it, the wiretap phase falls back to the text transcript in `nodes[].text`)

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

The whole import runs in **one database transaction**. Any error (invalid enum, missing required key, DB constraint) rolls back everything.

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

### Evidences — `theme` + `pages` (Universal Viewer)

The legacy `sub_type` + `metadata` structure has been **removed** (migration `2026_09_22_165922_refactor_evidences_for_universal_viewer`). Evidences are now rendered through one of two viewers:

| `evidence_type` | Viewer | Driven by |
| :--- | :--- | :--- |
| `image`, `audio` | `MediaViewer` | `img_url` / `audio_url` (`pages`/`theme` are **ignored**) |
| everything else (`document`, `forensic`, `testimony`, `digital`, `ballistics`) | `UniversalViewer` | `pages` (+ optional `theme`) — widget blocks, §9 |

| Field | Required | Type | Default (importer) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `title` | **YES** | string | — | ≤ 255 chars (DB) |
| `evidence_type` | **YES** | enum | — | §1 (7 values) |
| `description` | no | string \| null | `null` | |
| `theme` | no | string \| null | `null` | See placeholder below |
| `pages` | no | `WidgetPage[]` \| null | `null` | §9; required in practice for non-media types to display anything |
| `img_url` | no | string \| null | `null` | Only meaningful for `image` |
| `audio_url` | no | string \| null | `null` | Only meaningful for `audio` |
| `is_initial` | no | boolean | `false` | Owned by the team from the start (can be used to file requests immediately) |
| `is_vital_for_conviction` | no | boolean | `false` | If `true` and the team never obtains it → final verdict **auto-fails**. It must be obtainable: either `is_initial: true`, unlocked by a choice (`unlock_evidence_refs`), or granted as a request reward (`unlocks_evidence_ref`) |
| `ref_id` | no | string | — | Unique; required if referenced elsewhere |

**`image` / `audio` example (no `pages` needed):**

```json
{
  "ref_id": "ev_cctv_01",
  "title": "Alleyway CCTV Footage",
  "description": "Grainy visual of a suspect fleeing.",
  "evidence_type": "image",
  "img_url": "/assets/cctv-alley.jpg",
  "is_initial": false,
  "is_vital_for_conviction": false
}
```

**Widget-based evidence example (any non-media type):**

```json
{
  "ref_id": "ev_financial_01",
  "title": "Barada Commercial Bank Statement",
  "description": "August 2026 account activity.",
  "evidence_type": "document",
  "pages": [
    {
      "id": "page_1",
      "blocks": [
        { "id": "b1", "type": "KeyValueGrid", "props": { "items": [
          { "label": "Account Holder", "value": "Shell Corp LLC" },
          { "label": "Account", "value": "XXXX-9921" }
        ], "columns": 2 } },
        { "id": "b2", "type": "DataGrid", "props": {
          "headers": ["Date", "Description", "Amount"],
          "rows": [ ["2026-08-15", "Wire Transfer", "250000.00"] ]
        } }
      ]
    }
  ],
  "is_initial": false,
  "is_vital_for_conviction": true
}
```

> #### `theme` — PLACEHOLDER (not yet implemented)
> **Status:** the theme feature is not fully planned/implemented yet — deferred for a later pass. Current behavior only: `nullable|string` on the backend (free text, no validation, no enum), applied verbatim as a CSS class name on the `UniversalViewer` wrapper. No theme CSS classes exist in the codebase today, so unknown values are harmless no-ops (viewer keeps its default look). Tackle theme vocabulary/styling later; until then it is safe to omit `theme` entirely.

### Characters (Unified Persons of Interest)
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
| `unlocks_evidence_ref` | no (recommended) | string \| null | refs → `evidences[].ref_id` |
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

**Runtime rule:** filing succeeds only when the set of evidence IDs the player submits is **exactly equal** to the request’s required set (sorted set-equality in `InvestigationRequestService`). The listed evidences *are* the combination — extra or missing evidence fails the filing.

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
        "text": "Present the CCTV footage placing him at the scene.",
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

> There is **no ≥2-choices validation** on wiretap nodes anywhere in the code (legacy claim removed). Multiple choices are still a design recommendation so players actually have something to vote on.

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

## 9. Evidence Pages & Widget Props (`pages`)

`pages` is an array of pages; each page has an `id` and an ordered `blocks` array. Each block has an `id`, a `type` (§1 enum), and a `props` object spread directly into the React widget component.

```json
"pages": [
  {
    "id": "page_1",
    "blocks": [
      { "id": "b1", "type": "TextParagraph", "props": { "text": "…" } }
    ]
  }
]
```

**Rendering rules (`UniversalViewer`):**

*   Only `evidence_type`s other than `image`/`audio` reach this viewer (§5).
*   Block `type` must match a registered widget exactly (PascalCase). Unknown type → rendered as `[ UNRECOGNIZED BLOCK ]` (no crash).
*   A widget that throws → caught by an error boundary, shows `Widget corruption detected.` (rest of the page still renders).
*   `pages` missing/empty → blank viewer body.
*   Pagination controls appear only when `pages.length > 1`.
*   **Props below are the runtime component contracts and are authoritative.**

### Widget prop reference (13 widgets)

**`TextParagraph`**
| Prop | Type | Default |
| :--- | :--- | :--- |
| `text` | string | — (rendered as `<p>`) |
| `isBold` | boolean | `false` |
| `alignment` | `"left" \| "center" \| "right" \| "justify"` | `"left"` |

**`RawHtml`**
| Prop | Type | Notes |
| :--- | :--- | :--- |
| `html` | string | Sanitized via DOMPurify. Allowed tags: `b, i, em, strong, a, p, span, br, ul, li, ol, div`; allowed attrs: `class, href, target` |

**`KeyValueGrid`**
| Prop | Type | Default |
| :--- | :--- | :--- |
| `items` | `Array<{ label: string; value: string; isHighlight?: boolean }>` | — |
| `columns` | `1 \| 2 \| 3` (**numbers**) | `2` |

**`DataGrid`**
| Prop | Type | Default |
| :--- | :--- | :--- |
| `headers` | **`string[]`** (must be a JSON array — a comma-string crashes the widget) | — |
| `rows` | `Array<Array<string \| number>>` | — |
| `emptyMessage` | string | i18n fallback `"No data available"` |

If `rows` is empty, only `emptyMessage` is shown (headers are not touched).

**`CalloutBox`**
| Prop | Type | Default |
| :--- | :--- | :--- |
| `title` | string | `undefined` (header hidden) |
| `variant` | `"standard" \| "warning" \| "critical"` | `"standard"` |
| `children` | React content | **Required by the component.** Pass a string under the `children` key of `props` (e.g. `"props": { "children": "Findings…" }`) — there is no separate body field |

**`StampOverlay`**
| Prop | Type | Default |
| :--- | :--- | :--- |
| `text` | string | — (big diagonal stamp) |
| `variant` | `"red" \| "blue" \| "black"` | `"red"` |
| `rotation` | number (deg) | `-8` |

**`SignaturePad`**
| Prop | Type | Default |
| :--- | :--- | :--- |
| `seed` | number | —; picks asset `signature-{(seed % 18) + 1}.svg` |
| `label` | string | `"Authorized Signature"` |
| `isVerified` | boolean | `true` → badge `VERIFIED`; `false` → badge `FORGED` |

**`Barcode`**
| Prop | Type | Notes |
| :--- | :--- | :--- |
| `value` | string | Rendered as a barcode graphic |

**`TranscriptLog`**
| Prop | Type | Notes |
| :--- | :--- | :--- |
| `lines` | `Array<{ type: "q" \| "a"; speaker: string; text: string }>` | `q` = questioner line, `a` = answer line |
| `watermark` | string (optional) | Overlay stamp text |

**`AutopsyDiagram`**
| Prop | Type | Notes |
| :--- | :--- | :--- |
| `anomalies` | `Array<{ x: number; y: number; label: string }>` (optional) | Coordinates on an SVG viewBox of `0–100` (x) × `0–220` (y). Missing/empty → shows `No anomalies marked` |

**`SpectralGraph`**
| Prop | Type | Notes |
| :--- | :--- | :--- |
| `seed` | number | Deterministic graph shape (no semantic inputs) |

**`DnaBands`**
| Prop | Type | Notes |
| :--- | :--- | :--- |
| `seed` | number | Deterministic band pattern |
| `hasMatch` | boolean | `true` → `MATCH CONFIRMED`; `false`/missing → `NO MATCH` |

**`TerminalBlock`**
| Prop | Type | Notes |
| :--- | :--- | :--- |
| `lines` | `Array<{ type: "command" \| "system" \| "output" \| "error"; content: string }>` | Rendered as a terminal log |

Full example:

```json
"pages": [
  {
    "id": "page_1",
    "blocks": [
      { "id": "b1", "type": "TextParagraph", "props": { "text": "Autopsy Report — Case D-2026-89", "isBold": true, "alignment": "center" } },
      { "id": "b2", "type": "KeyValueGrid", "props": { "columns": 2, "items": [
        { "label": "Examiner", "value": "Dr. Sarah Sterling" },
        { "label": "Cause of Death", "value": "Blunt force trauma", "isHighlight": true }
      ] } },
      { "id": "b3", "type": "CalloutBox", "props": { "title": "Findings", "variant": "warning", "children": "Traces of blue synthetic fiber found in the wound." } },
      { "id": "b4", "type": "StampOverlay", "props": { "text": "CONFIDENTIAL", "variant": "red", "rotation": -8 } }
    ]
  },
  {
    "id": "page_2",
    "blocks": [
      { "id": "b5", "type": "AutopsyDiagram", "props": { "anomalies": [
        { "x": 45, "y": 70, "label": "Entry wound" },
        { "x": 60, "y": 110, "label": "Fiber trace" }
      ] } }
    ]
  }
]
```

> **Do not author against the admin page-builder form schema (`AdminBlockSchema.ts`)** — it currently disagrees with the runtime components for `DnaBands`, `SpectralGraph`, `TerminalBlock`, `AutopsyDiagram`, `DataGrid.headers`, `KeyValueGrid.columns`, `CalloutBox` body, and omits `TranscriptLog`. The table above reflects what the game actually renders.

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

**Hard rules:**

1.  **Duplicate `ref_id`s:** last definition wins for all references (the earlier entity still exists but becomes unreachable by ref). Keep refs unique.
2.  **Choice-ref ordering (`required_choice_refs`):** choices are created in document order — zone by zone, level by level, node by node, choice by choice — and each ref is registered the moment its choice is created. A choice may only reference choices **created earlier in that order** (a previous choice in the same node, or any choice in an earlier node/level). **Forward references are silently dropped.**
3.  **Outcome whitelisting:** only the keys in §8 survive the import. Runtime-shaped keys (`next_question_id`, `unlock_evidence`, `required_evidence`, …) are silently ignored — always use import-side names (`next_question_index`, `unlock_evidence_refs`, `required_evidence_refs`, …).
4.  **`next_question_index` is 0-based within the same level only** — there is no cross-level jump; use `unlock_levels_refs` for level unlocks.
5.  **Node `choices` and zone `levels` keys must exist** (arrays can be empty); every other “Required” field above is accessed without a fallback and will error (rolling back the import) if missing.
