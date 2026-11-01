# Production Readiness Verdict and Release Gates

Assessment date: 2026-11-01

## Current verdict

**Estimated readiness: 65/100. The project has substantial working gameplay, but it has not yet reached the 80% shipping threshold.**

This assessment uses the following scale:

- **0%:** Far from production.
- **80%:** A fully playable, robust release within the agreed solo scope, with only minor known issues that do not prevent completion, lose progress, or compromise essential security and recovery.
- **100%:** The fully intended game, including all planned features and functionality. The complete feature roadmap must be defined before this endpoint can be measured meaningfully.

The assessment prioritizes the absence of solo gameplay blockers and essential nonfunctional requirements. Architectural perfection, additional modes, and cosmetic polish are not prerequisites for the 80% milestone. Here, "fully playable" means that the cases included in the release can be completed and replayed reliably; it does not mean that every envisioned feature exists.

The estimate for reaching 80% is **3-5 focused working days, approximately 20-35 engineering hours**. Reserve one working week for planning purposes. This assumes a small solo launch, an available deployment environment, and no major progression defects discovered in the authored cases. Substantial deployment setup or broken case dependencies could add another 2-3 days. This is an estimate, not a release commitment: the verification gates below determine readiness.

This document records issues, required outcomes, and release verification. It intentionally does not prescribe implementation approaches or a sequence of code changes.

### Evidence and assessment limits

The assessment included architecture-guided source inspection, local automated checks, and isolated backend reproduction tests. It did not include a complete browser playthrough of an authored case or verification of the production environment.

| Check | Observed result |
| --- | --- |
| Frontend production build | Passed |
| Frontend automated tests | 64 of 64 passed |
| Backend automated suite | 430 tests; 6 errors, 1 failure, 1 skipped |
| Backend test errors | User fixtures missing the required `username` field; affected encounter lifecycle and reset tests |
| Backend assertion failure | Expected evidence-upload validation message differed from the returned image-dimensions message |
| Frontend lint | 1 error and 1 warning |
| Focused solo backend happy path | Question resolution, case completion, and XP award passed with a synthetic fixture and explicit finalization invocation |
| Focused issue reproductions | Last-player departure failed the room; final verdict left an encounter lock; finished room accepted a location inspection |

The happy-path test did not prove real queue delivery, realtime delivery, browser interactions, or the solvability of release content. Broken test fixtures are verification gaps, not proof that those same failures affect real users. Production configuration and operating procedures remain unverified, rather than confirmed absent.

## 1. Current issues

### ISSUE-01 — Page unload can terminate a solo investigation

**Priority:** Release blocker. **Evidence:** Source inspection and reproduced backend transition.

`GameRoomLayout` sends a leave request on `pagehide` when the page is not entering the browser's back/forward cache. This path can run on reload or tab closure. `GameRoomService::leaveRoom` marks the room failed when the departing host is the last participant.

Consequently, an ordinary refresh or closing the browser can turn an unfinished solo investigation into a failed room when the leave request succeeds. The result also depends on whether the browser delivers the unload request, making recovery behavior inconsistent. The focused test confirmed that the leave endpoint changes an active solo room to failed; browser reload behavior still requires end-to-end verification.

**Why it needs fixing:** A player must be able to recover from a normal browser lifecycle event without accidentally abandoning a case. Refreshing must not be a progress-destroying action. Explicit abandonment and temporary disconnection need distinct, predictable product behavior.

**Relevant sources:** `investigation-game-frontend/src/pages/GameRoom/GameRoomLayout.tsx`, `investigation-game-frontend/src/services/api.ts`, `investigation-game-backend/app/Services/GameRoomService.php`.

**Implementation update (2026-11-01, working tree based on 195dd8a):** The leave endpoint now accepts `reason: explicit|pagehide`, defaulting to explicit for existing callers. The browser keepalive request sends pagehide. Under the room lock, browser departure preserves an active lone host's room membership, encounter, votes, deadline, and progress. Multiplayer departure still removes membership and migrates the host; the last remaining host becomes resumable regardless of earlier participant count. Confirmed explicit exit retains abandonment and encounter cleanup, now scoped to the departing room, and local storage is cleared only after success. Terminal statuses are preserved. Ship the backend before the frontend; older clients still send an explicit leave on unload.

Recovery uses existing server-backed case discovery and Continue Investigation, including a fresh tab with no sessionStorage. Room reads remain read-only. The client refreshes on reconnect, focus, pageshow, and visibility return, and polls active visible rooms every five seconds independently of Echo. Failed refreshes retain cached progress; an initially failed join can retry on reconnection. Existing pruning remains unchanged: terminal rooms older than seven days and all rooms older than fourteen days by updated_at are eligible for daily pruning. Browser reads do not extend these limits.

**Verification evidence:** Local PHP 8.2 / SQLite in-memory regression tests exercise discovery/rejoining, preserved progress, pending interrogation deadlines, repeated finalization job handling, explicit encounter abandonment, cross-room cleanup isolation, migration followed by lone-host preservation, terminal status, unauthorized departure, and retention. Frontend tests exercise empty tab storage, keepalive reason/authentication, bfcache and listener cleanup, explicit-exit success/failure, transient refetch failure, reconnect after initial join failure, and eventual convergence after missed events. Existing encounter fixtures were corrected locally to supply usernames and extract IDs from a plain collection.

Frontend: 73 tests pass; production build passes with the existing large-bundle warning. The unconditional beforeunload warning has been removed so reload proceeds silently; pending ledger edits flush to local storage on pagehide or backgrounding instead of relying on the 800 ms debounce completing. Confirmed explicit abandonment still uses its existing confirmation dialog. Focused backend continuity and encounter lifecycle coverage passes (10 tests); the final full backend run has 436 tests / 1904 assertions, two unrelated reset-fixture username errors, the existing evidence-upload validation-message failure, and one existing skip. Frontend lint retains the existing InterrogationPhase purity error and CampaignTab dependency warning. PHP syntax checks and git diff whitespace checks pass.

**Remaining verification:** Browser tooling connected, but opening the running local Vite app at http://127.0.0.1:5173 timed out (`ERR_CONNECTION_TIMED_OUT`); no browser lifecycle outcome is claimed. Service/job-handler tests do not prove browser close/reopen, real queue delivery, deployed realtime authorization, or production recovery. TASK-01 and all unverified release gates remain unchecked pending browser evidence.

### ISSUE-02 — Final verdict can leave a player locked in an old encounter

**Priority:** Release blocker. **Evidence:** Reproduced in an isolated backend test.

A final verdict can conclude a case while the player still has an active interrogation membership. The verdict finalization path does not release that membership. Starting an interrogation in another room checks for any active encounter membership belonging to the player and rejects the action with "Leave your current encounter before starting another."

The game-end screen's return-to-menu action navigates to the menu without explicitly leaving the old room. The focused reproduction concluded a case during an encounter, created another room for the same player, and confirmed that starting the new encounter failed.

**Why it needs fixing:** Completing or failing one game must not prevent the player from playing the next one. Players should not need an undocumented cleanup action or administrative intervention to recover their account's ability to play.

**Relevant sources:** `investigation-game-backend/app/Services/AssessmentService.php`, `investigation-game-backend/app/Services/EncounterGroupService.php`, `investigation-game-frontend/src/pages/GameRoom/components/GameEffects/GameEndOverlay.tsx`.

**Implementation update (2026-11-01):** Every terminal assessment now closes the room's active encounter groups in the same transaction as its final status, stats, participant results, and XP. This covers perfect/no-crime wins, partial wins, missing proof, undiscovered culprits, verdict strike limits, and encounter strike failure. Shared encounter cleanup locks the room before groups, releases active membership keys and voter rosters, clears deadlines and active group keys, and retains votes, membership history, question references, and resolutions. It does not mark unfinished levels completed. Existing after-commit group and terminal events publish the committed state; current room refresh behavior recovers missed updates. Nonterminal verdict rejections preserve encounters. Repeated terminal calls and pending/repeated finalization jobs cannot change concluded rooms or duplicate rewards.

**Existing-data repair:** After backend deployment and queue-worker restart, run `php artisan encounters:release-concluded`. It processes terminal rooms in batches of 100, rechecks each under its room lock, reports groups closed, and is repeatable without timestamp/reward changes. Active and unrelated rooms remain untouched. The command was tested against isolated stale-room fixtures; it has not been run against production data.

**Verification evidence:** PHP 8.2 / SQLite in-memory: focused concluded-encounter, encounter lifecycle, vital-evidence, and solo-continuity tests pass (22 tests / 340 assertions). New regressions exercise eight terminal outcomes with parallel groups, subsequent host start and participant join, unrelated active-room isolation, preserved votes/history/results, stale jobs, repeated cleanup, nonterminal strike/evidence/suspect rejection with continued voting, repair idempotency, transaction rollback, and replay XP/best-result preservation. Full suite: 447 tests / 2169 assertions, two existing ResetGameDataTest missing-username errors, the existing AdminEvidenceValidationTest image-validation-message failure, and one existing skip. PHP syntax and diff whitespace checks pass. No frontend code changed for this task.

**Limits:** Browser connection/selection timed out on both initial and recovery attempts; return-to-menu and subsequent play were not browser-verified. Local tests invoke job handlers and do not prove deployed worker/realtime delivery or database concurrency. TASK-02's backend outcomes are demonstrated; browser and deployment release gates remain unchecked.

### ISSUE-03 — Delayed progression and missed realtime events lack proven recovery

**Priority:** Release-blocking reliability gap. **Evidence:** Source inspection; deployment behavior has not been verified.

Interrogation answers finalize through a delayed queue job. The client refreshes after submitting a vote, which can occur before that job completes. Subsequent progression relies on realtime events or another action that refreshes room state. The inspected room flow has no periodic state fallback or explicit socket-reconnection resynchronization. The countdown itself does not refresh authoritative state when it expires.

A missed completion event can therefore leave the visible interrogation stale even if the server has advanced. An unavailable queue worker can prevent the server from advancing at all. The existing happy-path audit manually invoked finalization, so it did not establish that the deployed queue and realtime chain works reliably.

**Why it needs fixing:** A brief connection interruption must not leave a player indefinitely waiting at a completed countdown. Server progression and the displayed state must converge after recovery, and operational failures must be detectable.

**Local interrogation follow-up (2026-11-01):** The running local worker exposed a separate finalization crash: unlock outcomes passed empty support collections to `ItemsUnlocked`, which requires Eloquent collections. Both empty defaults now use the required type. Database-worker regressions cover two consecutive answers, level-only, evidence-only, character-only, location-point-only and combined unlocks, plus duplicate delivery. Conversation history now renders persisted room resolutions in order, retains only approved answers, survives reload/resumption, and remains accessible for completed interrogations through Swap. The shared preview/blur behavior is preserved.

**Local recovery and verification:** Restarted the local worker and retried only the identified failed interrogation job. A database read confirmed one resolution for the stalled question 109, progression to question 111, and zero queued/failed jobs. This is local recovery evidence, not production or browser verification. Focused backend checks pass (26 tests / 461 assertions); all frontend tests pass (82 tests / 15 files), lint/build, PHP syntax, and diff whitespace checks pass. The full backend suite reports 452 tests / 2294 assertions with the same two reset-fixture username errors, evidence-validation message failure, and one skip. Browser and deployment release gates remain unchecked.

**Relevant sources:** `investigation-game-backend/app/Services/EncounterGroupService.php`, `investigation-game-backend/app/Jobs/FinalizeEncounterQuestion.php`, `investigation-game-frontend/src/hooks/useInvestigationPhase.ts`, `investigation-game-frontend/src/hooks/useGameRoom.ts`, `investigation-game-frontend/src/pages/GameRoom/GameRoom.tsx`.

### ISSUE-04 — Public authentication endpoints have no verified abuse protection

**Priority:** Required before public exposure. **Evidence:** Login route middleware inspected at runtime; registration route inspected in source.

The login route has no application-level rate limiting, and the registration route has no explicit throttle in the inspected application configuration. External proxy or hosting protection was not assessed.

**Why it needs fixing:** Unrestricted login attempts expose accounts to repeated password guessing. Unrestricted registration can create unnecessary accounts and consume resources. Effective protection must be established for the deployed public endpoints; it cannot be assumed from the presence of authentication alone.

**Relevant sources:** `investigation-game-backend/routes/api.php`, `investigation-game-backend/app/Http/Controllers/AuthController.php`, `investigation-game-backend/bootstrap/app.php`.

### ISSUE-05 — Ordinary forbidden responses revoke the local login

**Priority:** Required gameplay/error-recovery correction. **Evidence:** Source inspection.

The shared frontend request handler treats both HTTP 401 and HTTP 403 as an expired or invalid session and clears the authentication token. However, the location inspection controller returns 403 for service-level rejections, including unmet gameplay prerequisites.

This means a rejected gameplay action can sign out an otherwise authenticated player. It conflates an unavailable action with invalid credentials and can interrupt the investigation unnecessarily.

**Why it needs fixing:** Players need useful feedback for rejected actions while keeping their valid session and progress. Authentication recovery must not activate for ordinary permission or gameplay validation failures.

**Relevant sources:** `investigation-game-frontend/src/services/request.ts`, `investigation-game-backend/app/Http/Controllers/GameRoomController.php`, `investigation-game-backend/app/Services/LocationInspectionService.php`.

### ISSUE-06 — Finished rooms still accept location inspections

**Priority:** Required state-integrity correction. **Evidence:** Reproduced in an isolated backend test.

`LocationInspectionService::inspect` checks encounter membership, location accessibility, and prerequisites, but does not reject a room merely because its status is solved or failed. The focused test confirmed that inspection succeeds in a failed room. Inspection can record discoveries and apply associated unlock outcomes.

**Why it needs fixing:** A concluded investigation must have a consistent final state. Stale screens or delayed requests must not continue changing gameplay data after the result has been determined. A visible end-game overlay is not sufficient enforcement at the server boundary.

**Relevant source:** `investigation-game-backend/app/Services/LocationInspectionService.php`.

### ISSUE-07 — Verification checks are not clean

**Priority:** Required release-confidence work. **Evidence:** Local test and lint runs.

Six backend tests error because their user fixtures omit the required `username` field. One evidence-validation test fails because its expected message differs from the actual validation response. Frontend lint reports an impure `Date.now()` call during interrogation rendering and a dependency warning in `CampaignTab`.

These results must be investigated according to their cause. Fixture errors do not establish product failures, and a message mismatch does not establish that invalid evidence is accepted. They do prevent affected checks from providing the intended assurance. The existing skipped backend test also needs an understood reason and scope before release sign-off.

**Why it needs fixing:** A release baseline needs dependable checks that exercise the intended behavior. Otherwise, new gameplay regressions can be hidden among existing failures, especially in encounter lifecycle coverage.

**Relevant sources:** `investigation-game-backend/database/factories/UserFactory.php`, `investigation-game-backend/tests/Feature/EncounterGroupLifecycleTest.php`, `investigation-game-backend/tests/Feature/ResetGameDataTest.php`, `investigation-game-backend/tests/Feature/Admin/AdminEvidenceValidationTest.php`, `investigation-game-frontend/src/pages/GameRoom/tabs/Campaign/Levels/Interrogation/InterrogationPhase.tsx`, `investigation-game-frontend/src/pages/GameRoom/tabs/Campaign/CampaignTab.tsx`.

### ISSUE-08 — Essential deployment and recovery behavior is unverified

**Priority:** Release qualification gap. **Evidence:** No deployment verification performed in this assessment.

The assessment did not verify queue worker supervision, realtime connectivity, deployment configuration, operational failure visibility, or database and media restoration on the intended host. The backend README already documents preserving and backing up local case media with the database, but a documented requirement is not evidence of a successful restore.

**Why it needs verification:** Local correctness alone does not establish a robust hosted product. A stopped worker can halt interrogations; missing media can make evidence unusable; an incomplete backup can prevent recovery of playable investigations. These are essential launch concerns even for a small release.

**Relevant sources:** `investigation-game-backend/README.md`, `investigation-game-backend/config/queue.php`, `investigation-game-backend/config/broadcasting.php`, `investigation-game-backend/routes/console.php`.

### ISSUE-09 — Complete authored-case playability is not yet demonstrated

**Priority:** Release qualification gap. **Evidence:** No complete authored-case browser playthrough performed in this assessment.

The focused happy-path test used synthetic data. It established a basic backend path through question resolution, verdict, and XP, but did not validate the actual cases intended for release. Evidence dependencies, procedural requests, dialogue branches, vital proof, media, and reachable conclusions must work together in real content.

**Why it needs verification:** A functioning game engine can still host an unsolvable case. The 80% milestone requires a player to reach an intended conclusion using the normal interface and available information, without database edits, hidden knowledge, or administrative intervention.

### Known minor concerns

The frontend build produced a JavaScript bundle of approximately 965 KB minified, or 303 KB compressed. This is a performance concern to assess on the intended devices and connections, not an automatic launch blocker. Cosmetic polish and additional features can remain outstanding at 80%, provided they do not obscure required interactions or evidence.

## 2. Tasks and required outcomes

These tasks define what must be true for release. They do not define how to implement it, assign work, or prescribe an execution order.

- [ ] **TASK-01 — Establish reliable solo session continuity.** Addresses ISSUE-01. Reloading, closing/reopening, and temporary disconnection preserve a recoverable investigation. Deliberate abandonment has explicit, predictable behavior and does not occur accidentally during routine browser events.
- [x] **TASK-02 — Ensure completed games release encounter restrictions.** Addresses ISSUE-02. Every terminal verdict outcome leaves the player able to start another room and its encounters. No concluded game retains a membership that blocks later play.
- [ ] **TASK-03 — Establish recoverable delayed progression.** Addresses ISSUE-03. A submitted answer reaches its authoritative outcome, and the client eventually displays that outcome after a missed event or reconnect. Temporary infrastructure interruptions do not leave an unexplained, permanent gameplay stall or duplicate outcomes.
- [ ] **TASK-04 — Establish effective public authentication abuse protection.** Addresses ISSUE-04. Login and registration behavior on the deployment host is bounded against repeated abusive requests while legitimate players can still authenticate normally.
- [ ] **TASK-05 — Separate rejected actions from invalid sessions.** Addresses ISSUE-05. Permission and gameplay failures provide understandable feedback without clearing a valid login. Actual authentication expiry still leads to appropriate reauthentication and preserves recoverable progress.
- [ ] **TASK-06 — Enforce concluded-room state integrity.** Addresses ISSUE-06. Solved and failed investigations reject further gameplay mutations, including stale or repeated requests, while retaining access to permitted result information.
- [ ] **TASK-07 — Establish a trustworthy automated verification baseline.** Addresses ISSUE-07. Test fixtures support the current schema, assertions reflect the intended contract, build and lint checks are clean, and the release blockers have meaningful regression coverage. Any skipped check has a documented reason and does not leave a required release behavior unverified.
- [ ] **TASK-08 — Demonstrate essential deployment and recovery readiness.** Addresses ISSUE-08. The intended host supports sustained queue processing and realtime delivery, exposes actionable operational failures, preserves required assets, and can restore a usable database/media backup.
- [ ] **TASK-09 — Demonstrate complete solo playability of release content.** Addresses ISSUE-09. Every case designated for launch has a verified playable route through its required mechanics to an intended conclusion, with reliable results and replay behavior. Any discovered content blocker is resolved before that case is included in the release.

## 3. Verification required to reach 80%

Release evidence should identify the tested revision, environment, cases, observed results, and any remaining limitations. Tests must cover player-visible behavior as well as backend state; passing isolated service tests alone does not satisfy these gates.

### Gate A — Complete solo gameplay

- [ ] A player can register or sign in, discover a released case, create a solo room, and enter the investigation through the normal interface.
- [ ] Each release case has a recorded complete solo playthrough on the intended deployment environment.
- [ ] Required location inspections, evidence discoveries, character unlocks, interrogations, and procedural requests are reachable and usable wherever the case uses them.
- [ ] Evidence text, images, audio, and other required media are accessible and understandable on the supported device/browser scope.
- [ ] Required proof and suspects can be discovered through normal play; no necessary dependency requires administrative intervention or an impossible ordering of actions.
- [ ] Supported success and failure outcomes behave as intended, including strike limits and invalid verdict attempts. Results, XP, and case history remain consistent with the game rules.
- [ ] Finishing or failing during an active interrogation, returning to the menu, and starting another game does not produce a stale encounter lock.
- [ ] Repeated clicks, duplicate requests, and delayed finalization attempts do not duplicate rewards, resolutions, or unlock effects.

### Gate B — Session continuity and recovery

- [ ] Refreshing during investigation and interrogation does not fail the room or lose authoritative progress.
- [ ] Closing and reopening the browser provides the intended way to resume an unfinished solo investigation without hidden cleanup steps.
- [ ] A brief network interruption followed by reconnection restores a usable, current screen, including when the tab stays visible throughout the interruption.
- [ ] Missing a realtime completion notification does not leave a permanent countdown or stale question.
- [ ] Temporary queue worker interruption followed by recovery allows pending progression to complete without duplicate outcomes or manual database repair.
- [ ] Rejected gameplay or permission requests display understandable feedback and retain a valid login.
- [ ] Actual session expiry and subsequent sign-in allow the player to recover the investigation as intended.
- [ ] Solved and failed rooms reject subsequent gameplay mutations, including requests originating from stale screens.

### Gate C — Essential security and operation

- [ ] Authentication, room participation checks, and admin restrictions are effective on the deployed API, including direct requests outside the UI.
- [ ] Public login and registration abuse controls are verified through observed behavior on the intended host.
- [ ] Production serves the application and authenticated traffic securely, uses the intended API/realtime endpoints, and does not expose debug traces or secrets in client errors.
- [ ] Queue processing remains available after the normal deployment/restart lifecycle, and a failed or stopped worker can be detected by the operator.
- [ ] Realtime authentication and event delivery work on the deployed frontend/backend combination, with the recovery behavior in Gate B verified independently.
- [ ] Required scheduled maintenance has been checked against the intended session-retention behavior so it does not unexpectedly remove resumable games.
- [ ] A database and associated case-media backup has been restored into an isolated environment, and the restored case and saved progress are usable.
- [ ] Deployment/restart preserves required media and player data, and operational failures provide enough information to diagnose a stalled game without exposing sensitive information.
- [ ] Representative case loading, evidence viewing, and progression are usable on the agreed launch devices/connections and expected small-launch traffic level. Severe stalls or timeouts are resolved; speculative large-scale optimization is not required.

### Gate D — Release baseline and sign-off

- [ ] The production frontend build succeeds for the revision being released.
- [ ] Frontend and backend test suites pass, with any skip explicitly reviewed and no essential release requirement left uncovered.
- [ ] Lint passes without unresolved errors; warnings are resolved or explicitly assessed as nonblocking.
- [ ] Regression checks reproduce the relevant failure conditions from ISSUE-01 through ISSUE-06 and demonstrate the intended corrected behavior.
- [ ] The complete browser playthrough and recovery checks run against the actual release candidate, including any changes made after earlier verification.
- [ ] Remaining issues are recorded with their impact and any necessary workaround. None prevents completing a release case, destroys progress unexpectedly, blocks subsequent games, compromises essential security, or prevents recovery from the tested interruptions.
- [ ] The release scope, verified cases, supported device/browser scope, and operational ownership are explicitly recorded.

**80% sign-off:** The milestone is reached when the required outcomes and gates above have supporting evidence, with only assessed minor issues remaining. It is not reached merely because the estimated week has elapsed, the application builds, or one uninterrupted happy-path session succeeds. This establishes a tested, fully playable solo release within the agreed scope; it does not promise zero defects or completion of the entire intended game.
