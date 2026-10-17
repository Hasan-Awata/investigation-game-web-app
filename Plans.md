# Open Codebase Tasks

> Re-verified against the working tree on 2026-10-17. Completed findings and completed remediation phases have been removed. The entries below are only remaining issues or decisions.

## Runtime and authoring

### L-02 — Location levels have no completion lifecycle

Location levels are intended to remain open workspaces: once discovered and any request gate is satisfied, players can revisit them without starting or completing an encounter. The current code has some of this shape—location levels bypass the start/submit lifecycle and inspections persist room-wide—but it is incomplete. The room stores one `current_level_id`, so one active encounter blocks other players; location clicks also attempt the ordinary vote endpoint, and the inspection endpoint does not enforce discovery or request gates.

**Planned behavior:**

- Any free player can start an available interrogation or wiretap encounter, or join its group before the first vote. The group roster freezes at the first vote. Votes and consensus are scoped to the group, with the existing host vote weight retained. A player in an ordinary encounter cannot leave their level or zone, while other players can act in parallel.
- Locations remain outside encounter groups. A player without an active ordinary encounter can enter or leave an available location freely. Discovery and `required_request_id` gates apply in both the UI and server endpoints.
- Authors can target coordinate choices inside location questions with an `unlock_location_points` outcome. Points referenced by an unlock outcome start hidden; other authored points are available once the location opens. Point unlocks and inspections are shared room state.
- A location click uses the inspection path only. The server validates room ownership, discovery, request gates, and point availability; records the inspection once; applies point outcomes once; and broadcasts changes to the room.
- A clear encounter-group consensus locks that question and applies its outcome once, revealing the next question or location points. Admin authoring and case bundle validation/import/export support valid location-point unlock references.
- Replace the room-wide active-level state with encounter groups and participant membership. Add persisted room-level point unlocks and migrate any in-progress room encounter and its participants into a group.

**Implementation assumptions:** level completion remains shared at room scope; a clear consensus is final and cannot be revised; a location point is a coordinate choice; non-targeted points are initially available once the location is open.

**Acceptance checks:** verify parallel groups and group-scoped voting; group roster freeze; ordinary-level movement locks versus free location navigation; API enforcement of discovery and request gates; one-time outcome application and room-wide point unlocks; and admin/bundle round trips plus rejection of invalid point references.

### E-01 — Case import is all-or-nothing

`CaseImportService::import` persists the full case graph in one transaction. Any persistence failure rolls back the entire import, so authors receive no partial per-entity result.

**Open decision:** retain atomic imports as the intended contract or introduce partial import and per-entity error reporting.

### E-07 / E-08 — Evidence metadata envelope validation is incomplete

`EvidenceMetadataMatchesType` needs `evidence_type` to validate `metadata.doc` and `metadata.terminal`. It receives that context through a custom `setData()` shim in bundle import, but the admin Form Request path does not supply it through Laravel's `DataAwareRule` contract. As a result, server-side form validation can skip the envelope/type checks; client validation is not a server boundary.

**Open work:** provide reliable type context on both the admin API and import paths, reject malformed or mismatched envelopes on the server, and preserve validation when the rule is invoked by both paths. This also closes the server-side validation gap for empty document/terminal blocks.

## Viewer and localization

### E-29 — Block-type allowlists are maintained separately

The backend metadata rule and frontend document/terminal types currently list matching block types independently. There is no shared generated contract or parity check, so the lists can drift as block types change.

**Open work:** establish one maintained contract or add a check that fails when the frontend and backend lists differ.

### E-30 — Unknown evidence types render inconsistently

`EvidenceCard` returns `null` for an unknown evidence type, while `EvidenceModal` renders a generic fallback. Invalid or newly introduced evidence can therefore disappear from the board while still opening in the modal.

**Open work:** use a consistent visible fallback for unsupported evidence types.

### E-32 — Audio MIME type is hardcoded

`MediaViewer` reads `audio_url`, but its `<source>` always declares `audio/mpeg`. The upload contract also accepts WAV and OGG files.

**Open work:** derive the source MIME type from the media URL or expose a validated media type with the evidence.

### E-34 — The app cannot select English

English viewer strings now exist, but `i18n.ts` initializes i18next with `lng: 'ar'`, and the frontend has no `changeLanguage` call or language selector. Users cannot switch the app to the English translations.

**Open work:** add a language selection/persistence path or remove the unused English locale if Arabic-only behavior is intentional.
