# Feature Isolation and Robustness Plan

Status: Planned. Implementation and verification remain outstanding.

## Objective and constraints

Keep one Laravel application and one React application. Improve internal boundaries so each feature owns its rules, shared workflows have explicit coordination, and failures leave the game recoverable.

Build on existing services, hooks, transactions, recovery behavior, and integration tests. Preserve behavior and response contracts during extractions before deliberately changing them.

- Inspect `graphify-out/graph.json` before locating code and dependencies, then verify against current working files.
- Preserve unrelated work and existing uncommitted changes.
- Deliver small, independently reviewable changes in the order below.
- Reuse existing safeguards and tests before introducing replacements.
- Keep pure business calculations independent of Laravel and database orchestration in focused application services.
- Keep critical gameplay writes synchronous and atomic. Publish notifications after commit.
- Introduce abstractions only for demonstrated duplication or dependency problems.
- Avoid microservices, a generic repository for every model, an event bus for every action, and wholesale directory rewrites.
- Proposed service and type names are illustrative; follow repository conventions during implementation.

## Feature ownership

| Area | Owns |
| --- | --- |
| Room sessions | Creation, joining, departure, host migration, restart |
| Encounters | Membership, voting, deadlines, dialogue advancement |
| Locations | Inspection eligibility and inspection records |
| Investigation requests | Submission matching and request completion |
| Progression | Applying shared unlock effects |
| Case conclusion | Verdict outcome, terminal status, final statistics, XP |
| Case authoring | Editing, validation, import/export, media references |

These are boundaries within the current codebase, not separate applications or packages. Features interact through small, explicit operations instead of directly modifying another feature's internal state or tables.

## 1. Establish a verified baseline

- [ ] Run backend tests, frontend tests, TypeScript build, and lint.
- [ ] Record existing failures separately from regressions introduced during this work.
- [ ] Identify and preserve existing uncommitted changes.
- [ ] Write a short architecture document defining ownership and permitted dependency directions.
- [ ] Identify the owner of every important gameplay state change.

**Completion check:** Checks have a known baseline and each important state change has a clear owner.

## 2. Protect gameplay invariants

Build on existing tests for concluded rooms, delayed queue delivery, snapshot recovery, and authored playthroughs. Extend coverage where it is missing.

- [ ] Concluded rooms reject every gameplay mutation.
- [ ] Repeated requests and jobs cannot duplicate XP, inspections, unlock effects, or question resolutions.
- [ ] Players cannot act on resources belonging to another room or case.
- [ ] Departure and restart preserve other players' valid sessions.
- [ ] Every conclusion path closes active encounters and persists final results consistently.
- [ ] Refresh and reconnect restore authoritative state.
- [ ] Player responses never expose hidden answers or private authoring fields.

Use focused service integration tests for database behavior and a few full workflow tests for feature interactions. Test observable rules rather than implementation details such as whether a helper was called.

**Completion check:** Breaking a critical invariant produces a meaningful test failure.

## 3. Extract shared progression effects

Start with duplicated unlock handling in `investigation-game-backend/app/Services/EncounterGroupService.php` and `investigation-game-backend/app/Services/LocationInspectionService.php`.

- [ ] Introduce one small progression service for evidence, level, character, and location-point changes.
- [ ] Validate that effect targets belong to the room's case.
- [ ] Return a typed description of the changes actually applied.
- [ ] Participate in the caller's transaction so effects remain atomic with the triggering action.
- [ ] Route interrogation and location unlocks through the shared implementation.
- [ ] Review investigation-request unlocks and reuse the same effects where their semantics match.
- [ ] Keep dialogue advancement in encounters, inspection records in locations, and request matching in investigation requests.
- [ ] Preserve existing event timing and payload contracts during extraction.
- [ ] Consolidate event construction only where the semantics match.
- [ ] Verify repeated application is harmless wherever gameplay permits retries.

**Completion check:** Changing a shared unlock rule requires one implementation change, and all participating features behave consistently.

## 4. Give case conclusion one owner

Remove circular coordination between encounter resolution, assessment, and cleanup.

- [ ] Establish one case-conclusion operation owning terminal status, final statistics, and XP persistence.
- [ ] Expose a narrow encounter-owned operation for closing active groups.
- [ ] Make departure invoke encounter-owned cleanup instead of directly editing encounter votes and membership tables.
- [ ] Structure conclusion cleanup so it does not call back through a service that can trigger conclusion again.
- [ ] Keep terminal status, rewards, statistics, and required cleanup in one transaction.
- [ ] Make repeated conclusion attempts safe and preserve the original committed result.
- [ ] Extract verdict and XP calculations into small pure functions or classes where this makes rules independently testable.
- [ ] Keep persistence and workflow orchestration outside those pure calculations.

Do not distribute critical conclusion changes across asynchronous listeners.

**Completion check:** Conclusion is atomic and repeatable, and the service call graph has no circular coordination.

## 5. Separate room reads from gameplay decisions

Start with `investigation-game-backend/app/Http/Controllers/GameRoomController.php`.

- [ ] Move room snapshot assembly into a dedicated query/presenter.
- [ ] Load required relationships efficiently and replace per-group queries with batching where appropriate.
- [ ] Extract weighted tally calculation so reads and encounter resolution share the same rule.
- [ ] Extract location availability rules so reads and inspection eligibility cannot drift.
- [ ] Keep the snapshot reader focused on reading and presenting state.
- [ ] Return explicit player-visible response shapes rather than relying mainly on hiding fields from fully serialized models.
- [ ] Apply one consistent policy for hidden answers and authoring-only fields.
- [ ] Keep controllers focused on validation, invoking operations, and mapping results to HTTP responses.

**Completion check:** Reading a room never advances gameplay, player responses expose only intended fields, and controllers contain no gameplay calculations.

## 6. Make feature contracts explicit

- [ ] Replace ambiguous arrays at important boundaries with a few typed structures, starting with validated progression effects and their results.
- [ ] Define inputs, outputs, and failure cases for operations called across feature boundaries.
- [ ] Return stable error codes alongside user-facing messages.
- [ ] Keep HTTP status mapping at the delivery boundary.
- [ ] Move shared frontend response and event types outside page components.
- [ ] Validate critical network payloads at runtime; TypeScript types alone do not validate external data.
- [ ] Retain and extend backend/frontend parity checks for duplicated contracts.
- [ ] Keep pure domain rules independent of Laravel while retaining focused Laravel services for database workflows.

Do not create a DTO for every method or wrap every Eloquent model in a generic repository.

**Completion check:** Callers can understand another feature's public operation without inspecting its internals.

## 7. Isolate frontend state updates and recovery

Start with `investigation-game-frontend/src/pages/GameRoom/GameRoom.tsx`.

- [ ] Move realtime subscription setup, teardown, and connection recovery into a dedicated hook.
- [ ] Extract pure, feature-specific cache update functions.
- [ ] Retain one authoritative room cache instead of duplicating persisted state in feature stores.
- [ ] Expose feature data and actions through focused hooks and selectors.
- [ ] Keep notifications, viewed-item state, and other UI state separate from persisted gameplay state.
- [ ] Use explicit renderer mappings for level types where they simplify conditional rendering.
- [ ] Preserve existing block registry extension patterns.
- [ ] Preserve snapshot recovery after refresh and reconnect.
- [ ] Handle duplicate, incomplete, and unexpected events through idempotent updates or snapshot refresh.
- [ ] Verify subscription cleanup, timer cleanup, room switching, and stale asynchronous responses.

Introduce event sequence/version tracking only if a demonstrated ordering problem requires it.

**Completion check:** An encounter event change does not require changing location update logic, and missed events can be recovered through a room snapshot.

## 8. Verify concurrency, retries, and failure behavior

- [ ] Audit lock acquisition and document a consistent order for workflows touching the same records.
- [ ] Verify critical uniqueness rules have database constraints.
- [ ] Keep external side effects outside transactions and publish gameplay notifications after commit.
- [ ] Verify stale queued deadlines are harmless.
- [ ] Verify duplicate jobs cannot apply outcomes twice.
- [ ] Define and verify worker retry and timeout settings.
- [ ] Add bounded network timeouts while preserving caller cancellation signals.
- [ ] Distinguish validation, access, network, timeout, and session-change failures in the frontend.
- [ ] After an uncertain mutation response, refresh authoritative state before offering a retry that could repeat the action.
- [ ] Verify overlapping votes, departures, finalization, and conclusion preserve valid state.
- [ ] Exercise important concurrency cases against the production database engine; SQLite-only checks do not establish locking behavior.

Reuse existing safeguards wherever they already satisfy these requirements.

**Completion check:** Retries, disconnects, overlapping actions, and delayed jobs leave valid, recoverable state.

## 9. Protect authoring changes and stored content

- [ ] Document the policy for editing cases with active rooms.
- [ ] Initially block destructive structural edits while active rooms depend on a case.
- [ ] Explicitly define which cosmetic edits are safe during active play.
- [ ] Share applicable validation rules between admin editing and bundle import.
- [ ] Verify references belong to the correct case.
- [ ] Preserve and extend import/export round-trip tests.
- [ ] Verify failed imports clean up database changes and newly created files.
- [ ] Validate authored paths for reachable progression and required vital evidence.
- [ ] Verify rejected edits leave existing content and active rooms unchanged.

Introduce full content versioning only if editing live cases becomes a demonstrated product requirement.

**Completion check:** An admin edit or imported bundle cannot silently invalidate an active investigation.

## 10. Make verification and recovery routine

- [ ] Create or update an automated quality gate for backend tests, frontend tests, TypeScript build, and lint.
- [ ] Include contract parity checks and a representative authored playthrough.
- [ ] Run queue delivery and recovery integration checks in an appropriate environment.
- [ ] Document deployment steps for migrations, configuration, worker restart, and scheduler operation.
- [ ] Document backup and restore procedures and verify an actual restore in a safe environment.
- [ ] Provide enough operational visibility to identify failed jobs, overdue encounter finalizations, and application failures.
- [ ] Use safe room/group identifiers in diagnostics without logging secrets, tokens, or sensitive player data.
- [ ] Extend existing operational tests instead of introducing a large monitoring platform.

**Completion check:** Developers can verify changes consistently, and operators can diagnose and recover from stopped workers or failed deployments.

## Delivery sequence and verification policy

1. Establish the baseline and invariant coverage before structural changes.
2. Extract progression effects before changing lifecycle coordination.
3. Establish lifecycle ownership before refactoring snapshot assembly and contracts.
4. Stabilize backend response contracts before reorganizing frontend event handling.
5. Verify concurrency and authoring protections against the refactored boundaries.
6. Finish with automated verification and operational documentation.

Keep every extraction independently reviewable. Do not combine unrelated cleanup or behavioral changes into a refactor. Run focused checks after each change and broader checks at milestones. Record commands, outcomes, and unresolved limitations as work progresses. Mark steps complete only after their completion checks pass.

## Success criteria

- A new inspection rule mostly changes location code and its tests.
- A voting change mostly changes encounter code and its tests.
- A shared unlock rule has one implementation and focused coverage.
- Features communicate through explicit operations instead of editing one another's internal state.
- Conclusion and rewards remain correct under retries and concurrent actions.
- Player snapshots and realtime updates agree on rules and contracts.
- Lost responses, missed events, refreshes, and worker interruptions do not permanently lose committed progress.
- Repeatable checks detect critical regressions before release.
- The resulting structure remains understandable without enterprise-scale frameworks or infrastructure expansion.
