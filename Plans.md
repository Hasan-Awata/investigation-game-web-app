# L-02: Interrogation Groups and Location Workspaces

## Summary and Goal

Replace this plan with the current implementation reference for L-02. The work removes wiretap, enables independent interrogation groups, and preserves locations as open workspaces. Interrogation outcomes finalize once, only after every required voter has submitted a vote and a server-authoritative five-second countdown completes without a tie.

This repository has a Laravel backend in investigation-game-backend and a React/TypeScript frontend in investigation-game-frontend. Read this plan, AGENTS.md, and git status --short at the start of each cold session. Preserve unrelated existing working-tree changes. Follow the separation in AGENTS.md: delivery layers validate and present, application services own gameplay rules, infrastructure persists and broadcasts.

## Current Code Compared with the Target

The current implementation uses one room-wide current_level_id and permits only the host to start an ordinary encounter. Votes are room-scoped; clicking a choice immediately writes or replaces a vote, host votes count twice, and some outcomes apply before consensus. The host later submits an assessment to advance or complete an encounter. There is no clear-vote operation, server-side countdown, persistent immutable question resolution, or group membership.

The location code currently assigns coordinate points to selected players and routes some point clicks through ordinary voting. The prior plan's location workspace direction remains: every player sees available points; opened descriptions are browser-local; inspections, intel, and point unlocks are shared; clicks call only the inspection endpoint.

Wiretap exists across level type validation, admin authoring, campaign UI, audio playback, routes, events, room state, case bundles, translations, and the Wiretap Warrant investigation request. Remove all active product support for it.

## Product Decisions — Preserve These

- Allow one active group per room and interrogation level. Different levels can run in parallel. A player can belong to only one active ordinary group.
- Any free room member may start an available interrogation and enters immediately. Joining an existing group is explicit. A new joiner counts as a required voter beginning with the next question.
- A room member who leaves and later rejoins the room may explicitly rejoin that same active group if it still exists; their vote is required beginning with the next question. A group abandoned after its final member leaves is resumed through a replacement group.
- The voters for a question are group members present when that question opens. If a member leaves the room, remove them and their current vote from the active quorum and tally immediately. Switching to another game tab is not leaving.
- Selecting an answer submits/locks the member's current vote. Show submitted choices and the live tally to the group. Members can clear or change their vote before resolution.
- Start a server-authoritative five-second countdown only after all required voters have voted and the weighted result is not tied. Ties wait for votes to change. A vote change, clear, or departure affecting readiness or tie state cancels or resets the countdown.
- The group creator has vote weight two while they are an active voter. The weight does not transfer on departure. The creator of a replacement group gets that new group's weight-two vote.
- On timer expiry, lock the winning choice, record an immutable room-level resolution, apply that choice's outcome once, then follow its next_question_id. Resolved questions never retry or rewind.
- A choice with no next_question_id completes the level for the room and lets the group return to the map without level-ending particles or animations. Preserve the existing maximum-strikes case-failure rule.
- If the final member leaves before level completion, abandon the empty group but keep resolved questions and outcomes. A new group starts at the next unresolved question.
- Locations are outside ordinary groups. Free players can enter and leave available locations. Opened descriptions are local; inspections, intel, and point unlocks are room-shared.
- Remove every wiretap feature and Wiretap Warrant concept. Clear existing application data while preserving users with is_admin = true. Keep historical migrations unchanged and use forward migrations for schema cleanup.

## Repository Map and Contracts

Inspect neighboring files before editing; names below identify the existing seams, not a requirement to keep current implementation details.

### Backend

- GameRoomController and routes/api.php currently expose start, inspect, room snapshot, vote, and assessment entry points. Keep controllers thin; delegate eligibility and lifecycle decisions to services. Continue using Sanctum and room-participant middleware, then enforce case, group, level, and membership authorization in the service.
- GameRoomService creates room state and currently distributes location questions to individual room users. Remove point assignment.
- VotingService currently persists room votes and applies outcomes. Replace it with group-scoped vote/clear and consensus readiness logic; do not apply an outcome on vote submission.
- AssessmentService currently walks choice successor links, deletes votes after strikes, and completes levels. Remove ordinary encounter assessment submission and move this progression to the finalization service/job. Keep final-case verdict behavior separate.
- GameRoom, RoomUser, RoomVote, RoomInspection, Level, Question, Choice, and their migrations provide the existing persistence conventions. The room_votes unique key currently assumes one room-level vote per user/question and must be changed for group scope.
- BroadcastsAfterCommit and the existing room channel/events provide the post-transaction broadcast pattern. Extend snapshot serialization and cache listeners without exposing choice outcomes.

### Frontend

- CampaignTab reads current_level_id, calculates room-wide host-weighted consensus, and locks map selection room-wide. Replace with the current user's active group, joinable groups, group roster, current question, quorum, votes, and timer.
- InterrogationPhase renders the current question chain and submits a vote from choice click. Add clear/change controls, vote status/live tally, and countdown using server state. Keep the existing dialogue reveal behavior; do not add a level-ending animation.
- LocationPhase currently filters player-assigned points and may call vote. Remove assignment and vote usage; keep open point descriptions local to the browser.
- useInvestigationPhase and services/api.ts contain vote, assessment, start, inspection, and wiretap mutations. Add explicit group start/join and vote clear contracts; remove only ordinary encounter assessment and wiretap playback.
- GameRoom.tsx listens for room-channel events and patches React Query state. Add/adjust group, timer, resolution, outcome, and location-unlock patching; clean up subscriptions.
- Types in src/types/index.ts must distinguish safe player data from admin-only outcomes. Never return raw choice outcomes in a player room snapshot.
- Admin authoring seams are ChoiceEditorCard, AdminLocationForm, QuestionRequestTrait, and AdminQuestionController. Bundle seams are CaseManifestValidator, CaseImportService, and CaseExportService.

### Existing invariants to reuse

- Level discovery is represented by is_initial and room_unlocked_levels; completion by room_completed_levels; request gates by required_request_id and completed requests. Reuse these instead of adding duplicate flags.
- Location coordinates use the legacy choice text form x,y | Label; use existing frontend coordinate helpers and add server validation for target choice IDs.
- Choice requirements include required_evidence and cross-level per-player required_choices. Keep that behavior.
- Player choices hide outcomes and may safely expose next_question_id. Keep that answer-key boundary.
- room_inspections already has a unique (room_id, choice_id) key. Handle duplicate inspection requests as idempotent no-ops and do not broadcast duplicate inspection events.
- Case bundles currently use format_version 1. Add optional location-point targets compatibly unless validation proves an explicit version change is required.
- Queue default is database; local development composer command starts a queue listener. A deployed queue worker must process delayed finalization jobs.

## Architecture and Persistence Requirements

Use application services for group lifecycle, access gates, voting readiness, question finalization, and shared outcome application. Use explicit request/response types and domain-appropriate errors at HTTP boundaries. Use transactions and row locks for group mutations and finalization. Broadcast after commit.

Persist these facts using repository naming conventions:

- Group: room, level, creator user, status, and lifecycle timestamps.
- Membership: group, user, joined/departed timestamps; a user has at most one active ordinary group membership.
- Vote: room, group, user, question, choice, and timestamps; one mutable vote per user/question/group before resolution.
- Room-level question resolution: unique room, level, question; winning choice, resolved time, and an idempotency marker for outcome application.
- Room-level level progress: current unresolved question and lifecycle sufficient for a replacement group to resume correctly.
- Finalization deadline: current question and persisted finalizes_at; stale delayed jobs must be identifiable and harmless.
- Location unlock: unique room and target coordinate choice; inspection uniqueness remains room and choice.

A room-level resolution is essential: replacing an empty group must resume after immutable resolved questions even though the replacement has a new group ID. Group-scoped votes remain separate from that shared progress.

## API and State Direction

- Room snapshot returns the viewer's active group, safe summaries of active/joinable groups, current question and membership/quorum state, group votes/tally, server finalizes_at, resolved question IDs/choices, and shared location unlocks.
- Start an interrogation through the existing start-level route or a neighboring route. It creates the group and enrolls the caller. If an active group already exists for that room/level, return its join availability without silently joining.
- Add an explicit join action for the active group. Reject a player who already belongs to another active ordinary group. Starting/joining a replacement group after an empty group begins at the room-level next unresolved question.
- Vote submission replaces the caller's current vote for the current unresolved question. Add explicit clear-vote action. Both require active group membership and an unresolved current question; resolution makes later mutation invalid.
- Remove the ordinary encounter submit endpoint/flow. Preserve final-case verdict submission.
- Location inspection accepts a choice ID only; derive its question/level/case from relations. Do not accept client claims about correctness, unlocks, eligibility, or dead-end state.
- Room events expose safe IDs/state only. Emit group membership changes, vote/tally state, timer deadline/reset, immutable resolution, and room-wide outcomes/unlocks after commit.

## Location Authoring and Bundle Contract

Add unlock_location_points to choice outcomes as an array of target coordinate choice IDs. Targets must be coordinate choices in location levels in the same case. Validate shape and ownership at admin request and bundle manifest boundaries. Bundle export/import must map target IDs through stable choice reference IDs after all choice references are known. Invalid, non-coordinate, non-location, cross-case, and missing references are rejected. Keep the field out of player-facing choice payloads.

Points targeted by an unlock outcome start hidden. Other points are available once their location is discovered and its request gate is complete. An inspection validates room participant, case ownership, location type, discovery, gate completion, and point visibility on the server. Record the inspection and apply all outcomes once in a transaction. Repeated/concurrent clicks return the existing inspection and do not reapply or rebroadcast it.

## Wiretap Removal and Data Reset

Remove wiretap from active backend/frontend source, admin tabs and forms, map/level rendering, audio playback, routes/events, room relations/state, API/types, locale strings, request enums and labels, bundle validation/import/export, and maintained generated project-context snapshots. Reject legacy imports containing wiretap level types or Wiretap Warrant requests.

Do not rewrite historical Laravel migrations. Add forward schema changes to remove playback storage and obsolete columns. The requested data reset preserves all user rows marked is_admin = true, deletes all other users and application data, removes case media through the existing media cleanup path, and invalidates sessions/tokens. Keep the reset operation idempotent and isolated from normal request handling. Do not execute it against a database unless that target has been explicitly confirmed in the implementation session. Do not remove generic question audio columns if supported non-wiretap flows still use them.

## Sprint Plan

At the start of every cold session, reread this plan, AGENTS.md, and git status --short. Preserve pre-existing modifications and report any overlap before editing the same file. At the end of each sprint, update this file with completed tasks, checks run, and remaining work. Do not refactor unrelated code.

### Sprint 0 — Baseline and contracts

Status: **Completed; verification partial** (2026-10-22).

Baseline findings recorded during this sprint:

- Working-tree changes were present before this pass across the backend, frontend, generated backend context, and this plan. They were preserved; edits in this sprint are limited to this plan and the lifecycle feature test.
- The current migration set is Laravel's configured application schema; the new encounter schema is introduced by a forward migration. The active DB connection is environment-configured. Queue defaults to `database`, `.env.example` uses database queue and log broadcasting, and the local `composer dev` command starts `queue:listen`.
- Room gameplay routes are inside Sanctum authentication and `EnsureRoomParticipant`; group/level/question/choice rules are delegated to application services. Room state is sent over private `room.{id}` broadcasts, with encounter payloads explicitly serializing roster, voter IDs, votes, tally, deadline, and resolution.
- Active wiretap references have been removed from runtime app/routes/frontend source; historical migrations are preserved. Reset media cleanup collects case, evidence, level, question, character, and evidence-block media before deleting application records. The guarded reset command remains unrun.
- The frontend already has typed group/snapshot contracts and listener payload types. Player snapshot choice outcomes are hidden by the backend serializer.
- Focused lifecycle coverage now exercises a nonparticipant start rejection, parallel level groups, explicit join and next-question voter eligibility, readiness deadline creation, and event payload fields/answer-key exclusion. Broader location inspection, deletion/reset, and authorization cases still need runtime acceptance coverage in their relevant implementation sprint.

Verification on 2026-10-22:

- `npm test -- --run` (frontend): **passed**, 6 files and 23 tests.
- `php -l tests/Feature/EncounterGroupLifecycleTest.php`: **passed**.
- `git diff --check`: **passed** for the files edited in this sprint.
- `php artisan test --filter=EncounterGroupLifecycleTest`: **not run**; PHPUnit cannot load the missing `vendor/autoload.php`. Backend runtime behavior is therefore not verified in this checkout.

This sprint's discovery and contract work is complete, but the requested full verification exit criterion is **not met** until backend dependencies are available and the focused feature test (plus location/reset acceptance coverage) runs successfully.

Tasks:
1. Record git status and inspect migrations, factories, DB engines, queue setup, current API error patterns, broadcasts, and relevant frontend components.
2. Map active wiretap dependencies and identify stored media cleanup paths.
3. Define typed room snapshot and event contracts for group membership, current question, voter readiness, tally, deadline, resolution, and location unlocks.
4. Add focused feature/component tests for externally visible lifecycle, access, and location rules before implementation.

Exit criteria:
- Tests/contracts establish group, vote, timer, location, and deletion semantics.
- Existing unrelated working-tree edits are preserved.
- No implementation assumptions remain about authorization or event payload safety.

### Sprint 1 — Data reset and persistence

Status: **Implementation complete; verification partial** (2026-10-22).

Implemented persistence and cleanup inspected:

- `app:reset-game-data` requires `--confirm` to match `DB::connection()->getDatabaseName()`, deletes case/application rows and non-admin users transactionally, clears admin remember tokens and session/token/reset-token tables, then deletes collected case media and orphaned evidence block images through `MediaService`. The reset has not been run against an application database.
- The forward migration creates encounter groups, active membership, per-question voter snapshots, group-scoped vote keys, immutable room-level question resolutions, and room-scoped location unlocks. Unique keys cover one active room/level group, one active group membership per user, one voter snapshot per group/question/user, one mutable vote per group/question/user, one resolution per room/level/question, and one unlocked point per room/choice.
- The same forward migration drops `game_rooms.current_level_id`, the `room_played_wiretaps` table, and `questions.audio_url`; historical migrations are unchanged. Existing evidence audio remains supported.
- `.env.example` defaults to SQLite. `config/database.php` also defines MySQL, MariaDB, PostgreSQL, and SQL Server, but this checkout does not identify which engine is used in production.

Coverage and verification on 2026-10-22:

- Added `tests/Feature/ResetGameDataTest.php` for exact-confirmation guarding, admin retention, game data/non-admin deletion, media cleanup delegation, and repeated reset behavior.
- PHP syntax checks passed for the reset test, command, and forward migration; `git diff --check` passed for Sprint 1 files.
- `php artisan test --filter=ResetGameDataTest`: **not run**; PHPUnit cannot load missing `vendor/autoload.php`. Fresh/upgrade migrations, uniqueness behavior on a live schema, and media cleanup have not been runtime-verified.
- No application reset was run because no target database was explicitly confirmed. The plan's destructive-operation guard remains in force.

Sprint 1 implementation and test authoring are complete. The verification exit criteria are **not met** until backend dependencies are available and the reset/migration checks pass on SQLite and the confirmed production database engine.

Tasks:
1. Add a one-time idempotent maintenance command/service that cleans case media, removes application rows and non-admin users, and preserves is_admin accounts, sessions/tokens policy, and schema.
2. Add group/membership/vote/resolution/level-progress/location-unlock tables and keys. Ensure group/user/question uniqueness and room-level immutable resolution uniqueness.
3. Add forward migrations removing current_level_id and wiretap playback persistence after replacement schema is ready. No old active-state backfill is needed because the approved reset clears existing application data.
4. Verify schema migrations for SQLite and configured production DB engines. Mark data cleanup irreversible and keep it out of routine request flows.

Exit criteria:
- Fresh and upgrade migrations succeed.
- Reset retains admin accounts and removes other application data/media.
- Constraints support parallel groups, replacement groups, one active membership per player, one current vote, and exactly one resolution per room-level-question.

### Sprint 2 — Backend group lifecycle and voting

Status: **Implementation complete; backend verification partial** (2026-10-22).

Changes completed or closed in this pass:

- Group start/join and group-scoped vote/clear flows enforce room, case, level, question, choice, and active membership gates. Different levels can run in parallel; duplicate active groups require explicit join; a user cannot start another group while an active membership exists.
- Voter snapshots are created when a question opens. Late joiners begin with the next question; departures mark their current voter snapshot departed, remove their current vote, and recompute readiness/deadline. Creator weight, tie handling, vote replacement, and clear behavior are covered by focused lifecycle test cases.
- Completed and max-strike-failed groups now release active memberships, allowing participants to start later encounters after level completion. Existing database uniqueness keys enforce one active membership per user and one active group per room/level.
- Group start/join responses and room snapshots serialize only live members, so a participant who left and later rejoined the room is not shown as an active group member until explicitly rejoining that group.
- Added lifecycle coverage for explicit join, parallel levels, late join eligibility, creator-weight ties, vote change/clear, departure quorum changes, post-completion membership release, and room/group access checks.

Verification on 2026-10-22:

- PHP syntax checks passed for the modified service, controller, and lifecycle feature test; `git diff --check` passed.
- `php artisan test --filter=EncounterGroupLifecycleTest`: **not run** because `vendor/autoload.php` is absent. Transaction races and database-enforced uniqueness therefore remain unverified at runtime.

Implementation and focused test authoring are complete. Full verification is still needed with backend dependencies available.

Tasks:
1. Add a focused encounter-group application service for eligibility, start, explicit join, departure, empty-group abandonment, and replacement-group resume.
2. Implement group-scoped vote selection/replacement and clear operations. Enforce room/case/level/question/choice and current membership on the server.
3. Snapshot each question's eligible voters at open. Later joiners begin at the next question; departures immediately shrink the active quorum and remove current vote weight.
4. Calculate tallies with group creator weight two while active and weight one for other current members; a tie remains open.
5. Persist finalizes_at when the complete quorum is non-tied. Reset/cancel it when votes or membership affect readiness or tie state.

Exit criteria:
- Any eligible free participant can start; explicit join is required for an active group.
- One active ordinary membership per player is enforced under concurrent requests.
- Join/leave/vote/clear races produce correct quorum, tally, and timer state.

### Sprint 3 — Finalization, outcomes, and realtime

Status: **Implementation changes complete; backend verification partial** (2026-10-22).

Changes completed in this pass:

- Finalization now locks the room before the group, matching room departure's lock order. It rechecks that the room remains active while holding the lock, then validates the group, current question, persisted deadline, quorum, and existing room-level resolution before applying an outcome.
- Join and vote now lock/read the current room state and reject work after the investigation has concluded. When the maximum strike count is reached, every active group in that room is marked failed and broadcast before the case failure transition.
- Realtime room listeners refresh authoritative room state when a malformed or mismatched group event arrives, and refresh when a player returns to the visible browser tab to recover events missed while away.
- Added focused feature coverage for duplicate finalization idempotency and max-strike failure across parallel groups, including rejection of a vote after room failure.

Verification on 2026-10-22:

- Frontend `npm test -- --run`: **passed**, 6 files and 23 tests.
- Frontend `npm run build`: **passed**; Vite reports the existing large-chunk warning.
- PHP syntax checks passed for the modified service and lifecycle test; `git diff --check` passed for Sprint 3 files.
- `php artisan test --filter=EncounterGroupLifecycleTest`: **not run**; PHPUnit cannot load missing `vendor/autoload.php`. Database concurrency behavior, delayed job execution, and after-commit broadcasts therefore remain unverified at runtime.
- The configured default queue is database-backed and local `composer dev` starts `queue:listen`; production worker availability remains unverified.

Implementation work for Sprint 3 is complete. Full verification remains outstanding until the focused backend test can run with dependencies installed and queue/broadcast behavior is checked in the target environment.

Tasks:
1. Add a delayed job keyed by group, question, and persisted deadline. Lock state and ignore jobs for stale deadlines, changed votes, abandoned groups, or already-resolved questions.
2. At valid expiry, persist the room-level immutable resolution and apply the selected choice outcome once within the transaction.
3. Advance through next_question_id. If absent, complete the level at room scope and restore map navigation. Preserve maximum-strikes case failure.
4. If a group empties, abandon it while preserving room-level resolutions/outcomes; replacement group starts at the next unresolved question.
5. Broadcast group/vote/timer/resolution/outcome/unlock changes after commit and add authoritative room refresh fallback.

Exit criteria:
- Simultaneous last votes, duplicate jobs, and retried requests resolve once and apply outcomes once.
- Ties never finalize; vote changes/departures reset or cancel deadlines.
- Outcomes remain hidden until resolution and clients converge from events or refresh.

### Sprint 4 — Frontend encounter and location UX

Status: **Implementation complete; frontend verified** (2026-10-22).

Changes completed or closed in this pass:

- Campaign navigation follows the viewer's active encounter membership. Active members remain in that encounter until completion/departure; free room members can inspect discovered locations or start/join available interrogations.
- Encounter UI displays the server-provided tally, vote deadline, roster, and each member's submitted/waiting/next-question status. Vote and clear controls disable while a request is pending or the room has ended; the join button also prevents duplicate submissions.
- Location descriptions remain browser-local, while point clicks call the location inspection API only. Removed the unused host-only prop from the location workspace. Added missing English interaction strings and Arabic roster/vote strings.
- Added focused component coverage for tally/roster/readiness, tie and deadline display, late-join voting restrictions, and inspection-only location clicks.

Verification on 2026-10-22:

- Frontend `npm test -- --run`: **passed**, 8 files and 28 tests.
- Frontend `npm run build`: **passed**; Vite reports the existing large-chunk warning.
- English and Arabic locale JSON parse; `git diff --check` passed.

Sprint 4 exit checks are verified by the current focused frontend coverage and production build. Cross-client realtime behavior still relies on Sprint 3's backend broadcast runtime verification.

Tasks:
1. Replace room-wide current-level UI with viewer active-group and joinable-group UI.
2. Add start/join controls, group roster, vote status, live choices/tally, clear/change vote action, tie state, and countdown display from server finalizes_at.
3. Lock Campaign map and level navigation for an active group member while keeping Case Details, Evidence, and Characters accessible. Unlock map at level completion without adding level-ending animations or particles.
4. Handle group abandonment/replacement state and prevent an active player from starting/joining another group.
5. Make all available location points visible, keep opened descriptions browser-local, remove point assignment and vote mutations, and use inspection only.

Exit criteria:
- UI matches authoritative group, quorum, vote, timer, and navigation state after realtime updates and refresh.
- Location exploration works for free users and inspections do not create votes.

### Sprint 5 — Wiretap removal and location authoring/bundles

Tasks:
1. Remove wiretap gameplay, audio/API/events, admin builders and level option, campaign/map rendering, request type, translations, and player/admin types.
2. Reject wiretap levels and warrant requests in manifests; remove export/import paths. Preserve historical migrations; add cleanup migration for obsolete table/columns.
3. Add location-point unlock editor and strict backend target validation.
4. Add stable reference mapping for location-point targets in bundle import/export and validation tests.
5. Refresh maintained generated context artifacts to reflect active source.

Exit criteria:
- No active product or bundle contract accepts wiretap.
- Valid location point targets round-trip across bundles; invalid targets are rejected.
- Generic audio support remains where needed outside wiretap.

### Sprint 6 — Verification and handoff

Tasks:
1. Run focused backend tests for lifecycle, authorization, quorum, ties, timers, departures, replacement groups, outcome idempotency, location inspection, bundles, and data reset.
2. Run focused frontend tests for start/join/navigation, vote controls, visible tally, countdown state, and local/shared location behavior.
3. Run full backend tests and frontend tests/build after focused checks pass.
4. Inspect git diff, git status, migration portability, and after-commit event behavior. Verify unrelated changes remain untouched.
5. Update this plan with final results, queue-worker requirement, known limits, and implementation summary.

Exit criteria:
- Focused and broader checks pass, or failures are clearly documented with cause.
- The reset operation has only been run after confirming the intended database.
- No gameplay decisions are deferred to the implementer.

## Acceptance Checks

- Parallel different-level groups; one active group per level; one active ordinary group per user.
- Start/join eligibility, explicit join, next-question eligibility for late joiners, and server-side gate enforcement.
- Live group votes/tally, clear/change, creator double weight, ties, five-second deadline, deadline reset/cancellation, and immutable resolution.
- Departure immediately removes current vote/quorum; empty group replacement continues at the next unresolved question without replay.
- Simultaneous last votes, vote changes, departures, and stale finalization jobs resolve consistently.
- Choice outcomes apply only after timer expiry and once; strikes advance to successors; maximum strikes fail the case; no successor completes level at room scope.
- Navigation lock applies only to Campaign map/levels; reference tabs remain available; game exit removes membership.
- All location point visibility, local open descriptions, shared inspections/intel/unlocks, secure gates, and duplicate-inspection no-op behavior.
- Admin validation and case bundle round trips for valid location-point targets; rejection of invalid, cross-case, or non-location targets.
- Wiretap routes, UI, authoring, request type, and bundle support are gone; legacy wiretap imports fail.
- Data reset retains is_admin accounts and removes other application data and associated media.

## Verification Commands

Run commands from the corresponding package directory and record actual results in this file:

- Backend focused: php artisan test --filter=<FocusedTestName>
- Backend full: composer test
- Frontend focused: npm test -- <test-file>
- Frontend build: npm run build

Use the repository's established commands and package scripts; do not install or download dependencies without checking the existing environment first.

## Implementation Progress — 2026-10-22

The current worktree has implementation changes across the backend and frontend. The following parts are in place:

- Added persisted encounter groups, member history, question voter snapshots, group votes, room-level resolutions, point unlocks, and database uniqueness keys for one active group per room/level and one active membership per user.
- Added group start/join/vote/clear lifecycle services, creator-weighted tallying, server-side countdown deadlines and delayed finalization, immutable resolution, shared outcome application, departure handling, replacement progression through resolved answer links, and group/location room events.
- Added server-side location inspection gates and idempotent inspection outcomes. Removed player-specific point assignment and ordinary votes from the location flow.
- Added `unlock_location_points` validation, admin selection of persisted location coordinate choices, and stable choice-reference bundle import/export.
- Removed active wiretap routes, runtime, authoring, level/request types, playback, and question-audio authoring/import contracts. Evidence audio support remains.
- Added a guarded `app:reset-game-data` operation. It requires `--confirm` to exactly match the active database name and has not been run.

Checks run so far:

- PHP syntax checks passed for 172 backend application, migration, and test files.
- Regenerated `investigation-game-backend/ai_backend_project_context.xml` from the current backend source.
- English and Arabic locale JSON parse successfully.
- The frontend production build passes. Vite reports the existing large JavaScript chunk warning.
- Added a focused lifecycle feature test, but PHPUnit cannot start because `investigation-game-backend/vendor/autoload.php` is absent in this checkout.

Remaining before handoff:

- Run focused acceptance tests for concurrency, auth gates, inspection idempotency, bundle references, and the reset command when backend dependencies are installed.
- `git diff --check` passes; Git reports line-ending normalization notices under the repository's autocrlf settings.
- Review migration rollback portability and the final diff; preserve unrelated pre-existing changes.
- Confirm the production queue worker processes delayed finalization jobs. Local `composer dev` starts `queue:listen`; deployment configuration is not verified here.
