# Critical Code Audit — Remediation Plan

> Audited: 2026-10-15
> Scope: entire monorepo (`investigation-game-backend` Laravel 12, `investigation-game-frontend` React 19).
> All findings below were verified against source code (file:line citations), not inferred.
> Findings §1-§15 and *Additional findings* come from the live-code audit.
> The *Imported backlog* section merges `story-building-guides/LEVELS/BUGS.md` and
> `story-building-guides/EVIDENCES/BUGS.md` (deduped — items already covered by the
> audit are mapped, not repeated).

---

## P0 — Broken right now

### 1. Every successful vote returns HTTP 500

- `investigation-game-backend/app/Http/Controllers/VoteController.php:46-47` reads `$result->value['unlocked']['suspects']` and `['victims']`.
- `investigation-game-backend/app/Services/VotingService.php:109-113` only returns keys `evidence`, `levels`, `character_updates`.
- Laravel converts the "undefined array key" warning into an `ErrorException` → **500 on every successful vote**.
- Additionally, `VotingService.php:35,41` `throw new \Exception` (raw) instead of returning `Result::failure` — so a player voting on a legitimately gated choice (missing prerequisite evidence/prior choice) also gets a 500 (with stack trace when `APP_DEBUG=true`) instead of the intended 422 message. `VoteController.php:34-48` only handles `isFailure()`, so the throw escapes.

**Impact:** Core gameplay loop (voting) is dead. Both the success path and the gated-choice path 500.

**Fix direction:** Return `character_updates` (or map to the keys the frontend truly consumes) in the controller; replace both `throw new \Exception` with `Result::failure(...)`. The frontend never reads `unlocked_suspects`/`unlocked_victims` — zero references in `investigation-game-frontend/src/` — so the keys can simply be removed/replaced.

---

### 2. `GET /rooms/{room}` ships the whole solution to the client

`investigation-game-backend/app/Http/Controllers/GameRoomController.php:136-173` eager-loads `gameCase.zones.levels.questions.choices` and serializes `$room` wholesale (line 173).

- **Answer key leak:** `Choice` model (`app/Models/Choice.php`) has **no `$hidden`** — every choice's full `outcomes` JSON (which choice unlocks which evidence/level, `next_question_id`, `gives_strike`) and `requirements` are serialized. A player can read the entire unlock graph and every correct answer from the network tab before playing.
- **Guilt reveal leak:** `unset($c->is_guilty, $c->charge)` at `GameRoomController.php:169` runs only *inside* the `filter→map` over `accumulated_characters`. The same model instances remain in `$room->gameCase.characters`, which is serialized at line 173. Any character that did **not** pass the unlock filter stays in the payload **with `is_guilty: true` and `charge` intact**. Whodunit leaked.

**Complication (why this is not a quick `$hidden` patch):** the leak is currently *load-bearing* — frontend gameplay code depends on reading `choice.outcomes.character_updates` client-side for its toasts/feedback:

- `investigation-game-frontend/src/hooks/useInvestigationPhase.ts:114-115`
- `investigation-game-frontend/src/pages/GameRoom/GameRoom.tsx:46,183`
- `investigation-game-frontend/src/types/index.ts:153`

**Fix direction:** Server-side outcome evaluation returning a sanitized "feedback view" per vote/choice (what the player is allowed to know now) instead of raw `outcomes`. Migrate the frontend off reading `choice.outcomes` before adding `$hidden`. Do this **before authoring more case content** — every new case deepens the client's dependency on the leaked shape. Also strip `is_guilty`/`charge` from all serialized characters (not just the accumulated copy), and whitelist fields/relations rather than serializing the whole room model.

---

### 3. No room-participant authorization on three endpoints (IDOR)

`routes/api.php` guards everything with `auth:sanctum` only. These endpoints have **no membership check**:

| Endpoint | Controller | Verified |
|---|---|---|
| `GET /rooms/{room}` (show) | `GameRoomController.php:134` | no check |
| `POST /rooms/{room}/submit` | `AssessmentController.php:16-32` | no check |
| `POST /rooms/{room}/investigate` | `InvestigationRequestController.php:16-53` | no check |

Contrast: `VoteController.php:27-30`, `GameRoomController.php:109-112` (inspect), `WiretapController.php:15`, `SuspectVerdictController.php:18` do it correctly.

**Any registered user can:**

- read any room's full state by ID (including the leaked solution above),
- force level submissions, strike accrual, and case finalization for other people's rooms,
- file warrants and unlock items in any room.

Combined with `AssessmentService::finalizeCaseForParticipants` awarding XP, this is both a game-integrity break and an **XP-farming vector**.

**Fix direction:** Add a room-membership middleware (or `abort_unless` guard) and apply it to `show`, `submit`, `investigate` (and audit every other `{room}` endpoint for consistency). One middleware kills the whole IDOR class.

---

## P0/P1 — Will break under real multiplayer or in production

### 4. Broadcasts fire inside DB transactions, synchronously

All 7 events in `app/Events/` implement `ShouldBroadcastNow` — WebSocket fan-out runs **inline in the HTTP request, inside the DB transaction**. `AssessmentService.php:19` opens the transaction; dispatches occur at lines 38, 46, 81, 115, 155, 245, … (also `VotingService.php:95,98`, `InvestigationRequestService.php:98,107`, `GameRoomService.php:108`).

**Failure modes:**

- Reverb unreachable → broadcast throws mid-request → **500 to the player**, and the transaction rolls back. A realtime transport outage takes down gameplay writes.
- Event broadcast, then a later statement in the transaction throws → clients have already mutated their cache for state that rolled back. Phantom unlocks/votes/level transitions.

**Fix direction:** `ShouldBroadcast` + queued broadcasting (database queue driver is already configured but unused — no Jobs exist), or at minimum `DB::afterCommit`. Never broadcast pre-commit state.

---

### 5. Concurrency races in the core loop

- **Voting** (`VotingService.php:46-95`): `updateOrCreate` + `syncWithoutDetaching` + event dispatches with **no `DB::transaction`**, and `room_votes` has **no unique constraint** on `(room_id, user_id, question_id)`. Concurrent duplicate votes double-count in consensus/strike math (`AssessmentService.php:26-28`); a mid-method crash leaves partial unlocks with the vote already written.
- **Warrants** (`InvestigationRequestService.php:69`): the "already completed" check is an unlocked read; no transaction. Two players can double-file the same request → duplicate unlocks and history rows (`room_filed_requests` also lacks a unique index).
- **XP finalization** (`AssessmentService.php:275-351`): unlocked read-then-insert on `case_user` + `User::increment('XP')`. Double-submitting a finished case double-awards XP — trivially reachable via finding #3.
- **`startLevel`** (`GameRoomController.php:79-97`): checks `current_level_id === null` then updates, no lock/transaction. Two host clicks can start two different levels.

**Fix direction:** Wrap each in `DB::transaction` + `lockForUpdate()` on the room row; use `upsert` for votes; conditional `UPDATE ... WHERE current_level_id IS NULL` for startLevel.

---

### 6. Missing data integrity constraints (root enabler of #5)

Verified **absent** unique indexes:

| Table | Missing unique |
|---|---|
| `room_votes` | `(room_id, user_id, question_id)` |
| `room_users` | `(room_id, user_id)` |
| `room_evidences` | `(room_id, evidence_id)` |
| `room_completed_levels` | `(room_id, level_id)` |
| `room_unlocked_levels` | `(room_id, level_id)` |
| `room_filed_requests` | sensible idempotency key |

(Present on `room_characters`, `room_played_wiretaps`, `room_inspections`, `room_investigation_requests` — the pattern exists, it was just not applied everywhere.)

Also missing indexes on hot-path filters:

- `game_rooms.status` — filtered on every `/cases` call (`CaseController.php:26`), no index (`create_game_rooms_table.php:15`).
- `cases.is_published` — filtered in `CaseController.php:19`, no index.
- `room_votes` composite indexes `(room_id, user_id, question_id)` and `(room_id, question_id)` for the upsert/consensus paths.

Duplicate `room_completed_levels` rows silently inflate the completion counts the scoring engine relies on (`AssessmentService.php:70`).

**Fix direction:** One migration adding the unique constraints + indexes.

---

### 7. Frontend env config is split-brained — deploy will break

| File | Variable | Shape |
|---|---|---|
| `.env:2` | `VITE_API_URL=http://localhost:8000/api` | with `/api` |
| `src/services/request.ts:4` | `VITE_API_URL ?? 'http://localhost:8000/api'` | with `/api` |
| `src/utils/assetUrl.ts:15` | `VITE_API_URL` | with `/api` |
| `src/main.tsx:20-22` | `VITE_API_BASE_URL \|\| 'http://localhost:8000'` | **without** `/api` |
| `src/hooks/useAuth.ts:14-15` | `VITE_API_BASE_URL \|\| 'http://localhost:8000'` | **without** `/api` |

Also: `main.tsx:20` gates the broadcaster choice on `VITE_PUSHER_APP_KEY`, which `.env` never sets. Locally everything resolves to `localhost` and works by accident. On any deployment, setting only one variable makes half the app point at localhost. **There is no `.env.example`.**

**Fix direction:** One base variable (e.g. `VITE_API_BASE_URL` without `/api`) driving `request.ts`, `useAuth`, asset URLs, and the Echo auth endpoint; add `.env.example`.

---

### 8. Echo channel is torn down and re-authorized on every render

- `investigation-game-frontend/src/pages/GameRoom/GameRoom.tsx:270` — effect deps: `[room, room?.id, patchRoomData, setGameOverData, addGlobalToast, t]`.
- `room` is a new object identity after every `setQueryData` patch (every realtime event).
- `patchRoomData` is recreated every render (`src/hooks/useGameRoom.ts:52` — not `useCallback`).
- Cleanup calls `window.Echo.leave(...)` (line 268).

**Result:** every realtime event and toast → `Echo.leave` + `Echo.private` re-subscribe → a fresh `POST /api/broadcasting/auth` each time, plus a window where `VoteLockedIn`/`ItemsUnlocked` events are dropped and clients desync. Auth endpoint flood under active gameplay.

Same non-memoization on `refreshRoomData` (`useGameRoom.ts:70`) defeats the `RoomData` context memo (`context/RoomContext.tsx:13-15`) and re-renders the whole room tree on every patch.

**Fix direction:** `useCallback(patchRoomData, [queryClient, inviteCode])`; reduce effect deps to `[room?.id, t]` and read the latest room inside updaters via functional `setQueryData`; memoize `refreshRoomData` with `useCallback([refetch])`.

---

### 9. Contract drift in `ItemsUnlocked` + phantom character cards

- `app/Events/ItemsUnlocked.php:17-23` constructor takes **5 params**; `app/Services/InvestigationRequestService.php:98` dispatches **6 arguments** (extra trailing `null` silently ignored today → becomes a `TypeError` when params are reordered).
- Payload shape mismatch: `VotingService.php:90` character updates use key `character_id`; frontend `GameRoom.tsx:185` checks both `update.character_id || update.id`, but `GameRoom.tsx:197-199` pushes the **partial** payload (`{character_id, status, is_unlocked}` — no `id`, no `name`, no `img_url`) into `accumulated_characters` as a "new Character" when the lookup misses → **phantom nameless, id-less cards** with `key={character_id}` for every client except the voter (who triggers a full `refreshRoomData`) until page reload.
- Vote HTTP response (`VoteController`) and vote broadcast (`ItemsUnlocked`) already disagree on character-update key names — the two paths must be unified.

**Fix direction:** DTO or named arguments for the event; never insert partial objects client-side (ignore + `refreshRoomData()` once instead); make backend key naming consistent (`character_id` everywhere or `id` everywhere).

---

## P1 — Debt that will bite soon

### 10. Unbounded growth, no data lifecycle

- Game rooms are never soft-deleted or archived (`app/Models/GameRoom.php` — no SoftDeletes, no prune/scheduled command). `game_rooms`, `room_votes`, `room_filed_requests`, `case_user` accumulate forever.
- Sanctum tokens never expire: `config/sanctum.php:53` → `'expiration' => null`. Dormant users' tokens persist forever.
- No endpoint applies `limit()`/`paginate()`. `CaseController.php:25-33` loads **all** of the user's active rooms on every `/cases` call; payload and `whereHas` scan grow linearly forever.

**Fix direction:** Scheduled job to archive/prune finished rooms; paginate `/cases`; set a token expiration.

### 11. `clearRoomSessionData` cross-room wipe

`investigation-game-frontend/src/utils/storage.ts:167` uses `key.includes(prefix)` with prefix `room_1` — leaving room 1 also deletes viewed/verdict/level state for rooms **10, 11, 100, …** (`room_10_viewed_evidence` contains `room_1`).

**Fix direction:** Boundary match: `key === prefix || key.startsWith(prefix + '_')`.

### 12. `getSafeStorage` trusts value shape → render crash

`storage.ts:44-70` heals JSON *parse* errors but returns `JSON.parse(raw) as T` unchecked. `src/hooks/useViewedItems.ts:7` does `new Set(getSafeStorage<number[]>(...))` — a stored `5` or `{}` parses fine, then `new Set(<non-iterable>)` **throws during render**, unmounting the GameRoom subtree. Also touched by `LocationPhase.tsx:41,45,49`.

**Fix direction:** Validate `Array.isArray(parsed)` (shape guard) inside the storage helper or add a typed `getSafeArrayStorage`.

### 13. Copy-pasted accessors guarantee drift

The `imgUrl`/`audioUrl` URL-prefixing closure is duplicated **7× across 5 models**:

- `app/Models/GameCase.php:77-88`
- `app/Models/Level.php:32-45`
- `app/Models/Question.php:20-44` (two)
- `app/Models/Evidence.php:36-60` (two)
- `app/Models/Character.php:34-43`

Fixing URL handling (Cloudinary transforms, path prefixes) in one model silently leaves six wrong.

**Fix direction:** Extract a shared trait / `Attribute` factory.

### 14. The "≥2 items" rule lives in 3 places

- `app/Http/Controllers/InvestigationRequestController.php:29-34`
- `app/Services/InvestigationRequestService.php:20-22`
- `app/Http/Requests/Admin/InvestigationRequestRequestTrait.php:41-49`

Different wording/messages in each. Editing the admin rule won't change gameplay behavior; messages diverge between admin UI and SPA.

**Fix direction:** Single source of truth (service), controller delegates.

### 15. Dead code masking intent — consensus logic only exists client-side

`VotingService::calculateLevelConsensus` (`VotingService.php:117-143`) is **never called**. The real consensus (host weight 2×) lives only in the browser (`investigation-game-frontend/src/pages/GameRoom/tabs/Campaign/CampaignTab.tsx:97-124`, re-derived in `InterrogationPhase.tsx` / `WiretapPhase.tsx`). The host-weight rule is **enforceable only client-side** — a modified client can ignore it.

**Fix direction:** Decide: either move consensus server-side (recommended — it gates game progress) or delete the dead service method and document why client-side is acceptable.

---

## Additional findings (lower severity, worth batching into the same sprints)

- **`joinRoom` POST inside a React Query `queryFn`** (`useGameRoom.ts:19-40`) under default `retry: 1` (`App.tsx:19`) — mutation retried by query retry policy. Server-side idempotent, but the pattern is unsafe. Split join into `useMutation`.
- **Optimistic filed request duplicates** (`useInvestigationRequest.ts:39-53` inserts `id: 'temp-…'`, then realtime `RequestFiled` at `GameRoom.tsx:225-230` prepends the real one, then `refreshRoomData`): brief duplicate/wrong-count entries in the tray.
- **Location inspection has no fallback** if the Echo event is dropped (`LocationPhase.tsx:73-105` `inspectMutation` has no `onSuccess` refresh) — given finding #8 churns subscriptions, this silently loses state.
- **Consensus recomputation is O(N²·V·U) per render** (`CampaignTab.tsx:97-124` inline `getQuestionConsensus`, called inside a `while` + `.map` in `WiretapPhase.tsx:32-65`) and defeats memoization (`InterrogationPhase.tsx:116-122` comments on this).
- **Uncleared `setTimeout`s** driving state (`GameRoom.tsx:96,112,258`; `useGameMutation.ts:165`; `useInvestigationRequest.ts:71`) — setState after unmount risk.
- **Unbounded localStorage keys** `inv_loc_state_<room>_<level>_*` (`LocationPhase.tsx:38-62`) and stale `active_room_id_for_<inviteCode>` (not swept by `clearRoomSessionData`); no schema versioning for stored shapes.
- **`request.ts:28` always calls `response.json()`** — currently safe (every backend endpoint returns JSON), breaks on any future `204`/empty response.
- **`startLevel` side-effect in a read path**: `distributeLocationQuestions` mutates/misuses the `show()` payload (`GameRoomController.php:153`).
- **No exception JSON rendering customization**: `bootstrap/app.php` `withExceptions` is empty — model-binding 404s render HTML unless the client sends `Accept: application/json`; generic `\Exception` surfaces as debug 500.
- **Host never migrated on tab close**: `beforeunload` guard exists (`GameRoomLayout.tsx:75-82`) but `leaveRoom` is only sent from the explicit exit modal — closing/navigating away leaves a ghost host until someone else triggers migration.

---

## Imported backlog — `story-building-guides/LEVELS/BUGS.md` + `EVIDENCES/BUGS.md`

> IDs (`L-*`, `E-*`, `A-*`) are preserved from the source guides for traceability.
> Items already covered by findings above are **not repeated** — see the mapping table.
> E-35 and E-17 were re-verified against source during this merge.

### Already covered by findings above (skipped)

| Guide ID | Covered by | Note |
|---|---|---|
| L-03, L-04, E-36 (500 half), A-01 | **#1** vote 500s / raw exceptions | Same root cause |
| A-02, A-03 | **#3** missing room authorization | Same endpoints |
| E-37 | **#2** wholesale room serialization | Fix must also drop locked `gameCase.evidences` (full `metadata`, `description`, `is_vital_for_conviction`) from the whitelist — that's the evidence dimension of the same leak |
| E-43 (stale `suspects`/`victims` keys + ctor drift) | **#1** + **#9** | — |
| A-08 | **#15** dead `calculateLevelConsensus` | — |

### Blockers (guide-reported)

**L-01 · `standard` levels are unplayable.** `LevelPresentationType::standard` exists and is the DB default (`app/Enums/LevelPresentationType.php:7`) but the admin form only offers 3 options (`LevelForm.tsx:89`) and `CampaignTab` falls through to `null` for anything but interrogation/location/wiretap (`CampaignTab.tsx:306-327`). Decide: implement rendering or remove the enum value + DB default.

**L-02 · Location levels are non-functional end-to-end.** Chain: `startLevel` rejects location with 400 so `current_level_id` is never a location (`GameRoomController.php:68`) → `VotingService` rejects every location-point vote (`$question->level_id !== $room->current_level_id`, `VotingService.php:21-22`) → `distributeLocationQuestions` never runs its split (`GameRoomService.php:137`) → `LocationPhase` has no submit and `AssessmentService::evaluateSubmission` requires an active level (`AssessmentService.php:20-24`), so a location level can never complete. Only `POST /inspect` dead-end flags work, masked by a local "found" bubble. Requires a design decision (either make locations a first-class active level or re-model them as stateless overlays with their own completion path).

**E-08 · Metadata envelope rule is inert on form save (`DataAwareRule` gap).** `EvidenceMetadataMatchesType` implements `ValidationRule` but not `DataAwareRule` (`app/Rules/EvidenceMetadataMatchesType.php:10`); on the Form Request path `setData()` is dead code and `$this->data` is `[]`, so the rule returns immediately (`:38-43`). **The API/JSON path has zero server-side envelope validation** — only the client-side `validateEvidenceForm` guards the admin UI. Any JSON client can store doc/terminal evidence with no/malformed metadata that renders "illegible" in game. Must be fixed together with E-07 (see Limitations).

**E-17 · Audio evidence is uploaded but never plays.** `MediaViewer` resolves `evidence.img_url || metadata.url` (`MediaViewer.tsx:18`) and never reads `audio_url`; `EvidenceModal.tsx:36` routes the `audio` type there. The backend stores the column correctly (`AdminEvidenceController.php:25,43,82`) — the viewer simply ignores it. One-line class of fix but it silently kills an entire evidence type.

**E-35 · Choices with `required_evidence` crash with 500.** `VotingService.php:33` calls `$room->evidences()`, but `GameRoom` defines only `unlockedEvidences()` (`GameRoom.php:44`) → `BadMethodCallException` on any choice carrying an evidence requirement. Verified during merge. Fix rides along with Phase 1/3 (same file as #1/#5).

**A-04 · Final verdict accepts undiscovered characters.** Submitted suspect IDs are never checked against the room's possessed/known characters — validated only with a global `exists:characters,id` (`AssessmentService.php:124-128`, `SuspectVerdictController.php:25-28`). A client can indict characters the team never met (including, combined with the #2 leak, the guilty one directly). Fix rides along with Phase 2/3 authorization/validation work.

### Bugs (guide-reported)

**Import pipeline:**
- **L-05 ·** Import attaches choice `requirements` by re-finding the choice on `question_id` + `text` (`AdminCaseController.php:445-447`) — identical `text` within one node collides; first match wins. Importer already has a 6-pass ref resolver; route requirements through stable `ref_id`s the same way.
- **L-06 ·** Import never validates `presentation_type` (`AdminCaseController.php:185` only checks the array; raw string hits the `Level` enum cast at `Level.php:24-27`) → `ValueError` → 500 + full-import rollback. The form path validates correctly (`AdminLevelController.php:25`); reuse the same rule in the manifest validator.
- **E-02 ·** No boolean coercion on import — `is_initial` / `is_vital_for_conviction` sent as `"false"` become `true` (`?? false` with no `boolean` rule, `AdminCaseController.php:271-272`), silently changing win conditions.
- **E-03 ·** Unknown `*_ref`s are silently dropped (`$mapRefs()` nulls + `array_filter`, `AdminCaseController.php:383-386,427-430`) — a typo produces a choice/request that references nothing, with no warning.
- **E-04 ·** Duplicate `ref_id`s collide — ref maps are plain assignments (`AdminCaseController.php:274,314,337,417`), later writes win.

**Evidence admin form:**
- **E-09 ·** Omitting `metadata` on update wipes the stored envelope — `update()` always writes the field; absent key → `null` (`AdminEvidenceController.php:58-70`).
- **E-10 ·** Malformed/non-object `metadata` stored silently (unchecked `json_decode` + `!empty()` presence test, `AdminEvidenceController.php:27-32,58-63`) — no validation because of E-08.
- **E-11 ·** Admin evidence list crashes the whole pane behind the ErrorBoundary on rows lacking `metadata.doc`/`terminal` — type guards check `evidence_type` but not envelope presence (`EvidenceForm.tsx:180-183`). Legacy/invalid rows brick the pane.
- **E-12 ·** `validateEvidenceForm` only asserts a non-empty blocks array (`validators.ts:32-36,45-63`) — a doc of default empty blocks passes and renders a blank sheet.
- **E-14 ·** Editing an evidence hardcodes `store_locally: false` (`EvidenceForm.tsx:145`), so replacement media silently goes to Cloudinary unless re-ticked; also drives block-image uploads (`:224`).

**Media storage (`MediaService` / controllers):**
- **E-18 ·** Content-hash dedup has no refcount — identical bytes share one `{sha256}.{ext}` file; delete/replace on either evidence unlinks it and 404s the other (`MediaService.php:22-40,66-77`).
- **E-19 ·** Case-slug collisions — `Str::slug($caseTitle)` with no id fallback; non-Latin titles → `""` and duplicate titles share one folder; combined with E-18 can unlink another case's asset (`MediaService.php:15,19,36-40`).
- **E-20 ·** Delete-before-store on update, no transaction — if the replacement upload throws (`MediaService.php:58`) after the old file was deleted (`AdminEvidenceController.php:75-83`), the DB row points at a missing asset.
- **E-23 ·** Inconsistent URL shape — column accessors emit absolute URLs (`Evidence.php:36-60`) while doc-block image URLs persist relative (`AdminMediaController.php:42-47`); consumers not routing through `assetUrl` 404 depending on environment.
- **E-25 ·** Silent delete failures — `@unlink(...)` and bare `catch (\Exception) {}` (`MediaViewer`-path `MediaService.php:74,93-97`) swallow errors; orphans accumulate with zero signal.

**Rendering (frontend):**
- **E-26 ·** `normalizeDoc` accepts blocks without `props` (filter only checks `type`, `doc.ts:300-302`, unlike terminal's `:109-117`); `ensureBlockIds` then dereferences `withId.props.left` (`doc.ts:311-325`) — **one malformed block blanks the entire sheet** via the ErrorBoundary.
- **E-27 ·** Testimony header fields (agency/title/subject/interviewer/date) cannot be authored — the form only exposes a transcript (`EvidenceMetadataFields.tsx:27-36`) while the template seeds `""` (`formUtils.ts:29-40`) and the viewer's defaults only fire on `undefined` (`TestimonyViewer.tsx:16-25`) → blank headers.
- **E-31 ·** Image board card ignores the `metadata.url` fallback the viewer honours (`ImageEvidence.tsx:42,77,85` vs `MediaViewer.tsx:18`) — card shows "no image" while the viewer opens it fine.
- **E-30 ·** Unrecognized `evidence_type`: card logs + returns `null` (`EvidenceCard.tsx:38-41`) while modal throws (`EvidenceModal.tsx:41-43`) — inconsistent failure modes for the same bad row.

**Runtime:**
- **E-36 (is_initial half) ·** The possession set for requirement checks is built from `room_evidences` only (`VotingService.php:33`), unlike `InvestigationRequestService.php:25-27` / `AssessmentService.php:102-104` which add `is_initial` — a choice requiring a starting (always-possessed) evidence is falsely rejected. (The 500 half is finding #1; the missing-relation crash is E-35.)
- **E-38 ·** Unlock targets are not validated against the room's case — `Evidence::whereIn` / `Level::whereIn` / `syncWithoutDetaching` are unrestricted by `case_id` (`VotingService.php:63-93`, `InvestigationRequestService.php:79-95`) and admin validation uses global `exists:*` rules; a malformed bundle can unlock another case's content, which then counts as "possessed" without appearing on the board.
- **E-39 ·** Deleting an evidence cascades destructively — FK `cascadeOnDelete` on `investigation_requests.unlocks_evidence_id` + `investigation_request_items.evidence_id` (`2026_08_06_063400…php:16,24`), cascade on `room_investigation_requests.request_id` (`2026_08_08_193441…php:19`), and `levels.required_request_id` → `nullOnDelete` (`2026_08_09_180614…php:13-17`): one evidence delete can remove the unlocking request, erase room completion history, and **silently un-gate a level**. Treat published cases as append-only until FK actions are revisited (`restrictOnDelete`/soft deletes).
- **E-43 (timestamps half) ·** `InvestigationRequestService.php:80-83,89-92` writes pivots via `updateOrInsert`, omitting `created_at`/`updated_at`. (Stale-key half is #1/#9.)
- **A-05 ·** `startLevel` ignores case scoping and unlock state — a host can start any level by ID including cross-case and un-unlocked ones (`GameRoomController.php:65-101`); the existing guards cover only Location type, host, active-level conflict, completed, and required-request. Extend with: level belongs to room's case + (unlocked or `is_initial`).
- **A-06 ·** Voting and level submissions ignore room status — only the final verdict checks `RoomStatus::Active` (`AssessmentService.php:95`); votes (`VotingService.php:19-115`) and `evaluateSubmission` (`AssessmentService.php:17-88`) do not, so a Solved/Failed room keeps accepting input.

### Limitations (design gaps — decide before fixing)

**Level/node system:**
- **L-07 ·** Questions have no `order_index`; play order is implicit (lowest-id start + link following; `nodes[]` creation order becomes id order). Add an ordering column or document the contract.
- **L-08 ·** Level/question media (`img_url`, `audio_url`) are not part of the import (`AdminCaseController.php:304-312,358-364`) — wiretap nodes import unplayable without audio. Two-step build is the current workaround; same gap as E-05.

**Import fidelity (Flow 1):**
- **E-01 ·** A single `evidences[]` item missing `title`/valid `evidence_type` aborts the whole all-or-nothing import transaction (`AdminCaseController.php:180-181,239`). Consider per-entity error reporting instead of total rollback.
- **E-05 ·** Evidence media (`img_url`/`audio_url`) not importable — `Evidence::create` writes scalars only (`AdminCaseController.php:265-273`).
- **E-06 ·** `required_character_refs` ignored on import — only `requiredEvidences()` is synced (`AdminCaseController.php:340-342`); no `requiredCharacters()` pass exists even though the runtime supports character requirements.
- **E-07 ·** Envelope validation on import only works via a manual `$rule->setData(['evidence_type' => …])` shim (`AdminCaseController.php:214-221`); making the rule a proper `DataAwareRule` (the E-08 fix) would let the framework overwrite that injection and **silently disable import validation**. E-07 + E-08 must be fixed as one change to both call paths.

**Form/media (Flows 2-3):**
- **E-13 ·** JSON populate reads only `metadata` + scalar fields (`EvidenceForm.tsx:79-104`) — top-level `{doc}`/`{terminal}` payloads and `img_url`/`audio_url` keys are ignored.
- **E-15 ·** Uploaded media is not coupled to `evidence_type` server-side (`EvidenceRequestTrait.php:21-22`) — API clients can attach image files to audio evidence etc.; only the admin UI prevents it.
- **E-21 ·** Doc block images (`assets/cases/{slug}/Evidences/Blocks/*`) are never cleaned up — `storeBlockImage` writes (`AdminMediaController.php:31-53`) but no code deletes block URLs inside `metadata` on evidence/case delete. Unbounded disk growth; needs a GC pass or refcount.
- **E-22 ·** No way to clear/replace `img_url`/`audio_url` or set remote URLs — rules omit the columns and the controller only sets them inside `hasFile()` branches (`EvidenceRequestTrait.php:13-24`, `AdminEvidenceController.php:75-83`).
- **E-24 ·** Naive `config('app.url') . $value` concat (`Evidence.php:44,57`) — no leading-slash normalization; behind a proxy emits the internal origin. Overlaps **#13** — fix together when extracting the shared accessor.
- **E-32 ·** Audio `<source>` MIME hardcoded to `audio/mpeg` (`MediaViewer.tsx:89`) though the uploader accepts mp3/wav/ogg — wav/ogg may not play even after E-17.

**Rendering (Flow 4):**
- **E-28 ·** Unknown block types are silently dropped by `normalizeTerminal` (`terminal.ts:109-117`) / the doc registry — data loss without warning. Align with backend whitelist (E-29) or surface a visible "unsupported block" placeholder.
- **E-29 ·** Backend terminal whitelist allows `encryption_flow`, `hash_matrix`, `ascii_panel`, `packet_trace` (`EvidenceMetadataMatchesType.php:18-21`) that the frontend never renders (`terminal.ts:65-71`) — JSON-authored evidence validates then silently loses blocks. Whitelists must be defined once and shared.
- **E-33 ·** Empty `blocks` array is a rendering state ("illegible/corrupted"), not a validation error — should be rejected at save time (pairs with E-12).
- **E-34 ·** English locale is missing the `evidence.viewers.*` subtree — `en/translation.json` has only ~49 lines of evidence keys; viewers (`TestimonyViewer.tsx:17-99`, `MediaViewer.tsx:57,90`) fall back to Arabic (`i18n.ts:27-28` defaults `lng`/`fallbackLng` to `ar`). EN users see Arabic viewer strings.

**Runtime (Adjacent):**
- **E-40 ·** `is_vital_for_conviction` is possession-only — `evaluateFinalVerdict` checks `array_diff($vital, unlocked ∪ initial)` (`AssessmentService.php:99-108`); no "presented/used" tracking exists. Design decision: keep possession semantics or add explicit evidence presentation at the verdict.
- **A-07 ·** Investigation-request matching requires exact set equality (`InvestigationRequestService.php:50-51`) — required items **plus any extra** discovered item fails the filing. Decide: subset-accept (recommended) or keep exact-match and document loudly.

### Cleanup (cosmetic / dead code)

- **L-09 ·** `Question::$fillable` still lists dropped column `msg_when_wrong` (`Question.php:16`; column dropped in `2026_08_10_205829…`).
- **E-16 ·** `StoreEvidenceRequest::rules()` re-declares the trait's rule array (`StoreEvidenceRequest.php:27-39`) instead of using `EvidenceRequestTrait` (`:13-24`, consumed only by `UpdateEvidenceRequest`) — guaranteed drift.
- **E-41 ·** `evidences.sub_type` column exists (`2026_08_19_112215…php:10`) but is absent from `Evidence::$fillable`/casts — dead schema.
- **E-42 ·** `EVIDENCES/MEDIA.md` §8 claims evidence deletion leaves assets behind — code does delete `img_url`/`audio_url` (`AdminEvidenceController.php:94-95`); only doc-block images orphan (E-21). Fix the guide.

---

## Remediation order

| Phase | Work | Est. | Unblocks |
|---|---|---|---|
| **1** | Fix vote 500 + raw exceptions (#1) **+ E-35** (`$room->evidences()` → `unlockedEvidences()`) **+ E-36 is_initial half** (same method) | ~2h | Core loop works again |
| **2** | Room-membership middleware on all `{room}` endpoints (#3) **+ A-04** (verdict possession check) **+ A-05** (startLevel case scoping/unlock) **+ A-06** (room-status guards on vote/submit) | ~0.5 day | Kills IDOR/XP-farm/spoiler-adjacent exploits |
| **3** | Unique constraints + indexes migration (#6), then transactions/locks in voting, warrants, finalize, startLevel (#5) **+ E-38** (case-scope unlock targets) **+ E-39** (FK cascade audit) | ~1 day | Multiplayer integrity |
| **4** | Strip the answer key (#2): server-evaluated feedback view + frontend migration off `choice.outcomes`; hide `is_guilty` globally **+ E-37** (locked evidence relation) | ~2-3 days | Game is fair again; do before more content is authored |
| **5** | Broadcast-after-commit / queue (#4); `ItemsUnlocked` DTO + payload unification (#9); frontend effect deps + memoization (#8) | ~1-2 days | Realtime stability |
| **6** | Unify env var + `.env.example` (#7); harden `getSafeStorage` (#12) and `clearRoomSessionData` (#11); extract URL accessors (#13 + E-24); dedupe ≥2-items rule (#14); delete/move dead consensus code (#15 + A-08) | ~1 day | Debt burn-down |
| **7** | Data lifecycle: room archival job, token expiry, pagination (#10) | ~0.5 day | Long-term scale |
| **8** | Guide blockers: **E-08+E-07** (envelope `DataAwareRule` fix, both call paths), **E-17** (audio viewer), **L-01** (decide `standard` fate), **L-02** (design decision: location levels) | ~1-2 days | Authoring + evidence-type correctness |
| **9** | Guide import bugs: L-05, L-06, E-01…E-06 (ref resolution, validation parity, media/character-ref import) | ~1-2 days | Import fidelity |
| **10** | Guide media pipeline: E-18, E-19, E-20, E-21, E-22, E-25 (refcount, slug fallback, store-before-delete, block-image GC, URL setters) | ~1-2 days | Media integrity + disk hygiene |
| **11** | Guide form/render: E-09…E-16, E-26…E-34 (metadata validation, crash guards, EN locale, whitelist parity) | ~2 days | Admin UX + render robustness |
| **12** | Guide limitations/cleanup: L-07, L-08, E-23, E-33, E-40, A-07, E-41, E-42, L-09, E-43 timestamps | ~1 day | Backlog close-out |

**Phases 1-3 are the minimum viable hardening tier** (~2 days total) and eliminate everything actively broken or exploitable, including the guide-reported blockers that live in the same files (E-35, A-04…A-06). Phase 4 is the only architectural change — start it before authoring further case content, since every new case deepens the client's dependency on the leaked `outcomes` shape. **Phase 8's E-08/E-07 pair should be prioritized within the guide work**: until the envelope rule runs on the form path, every new evidence authored via API/JSON can silently corrupt a case.