# Production Readiness: Remaining Issues and Acceptance Criteria

Review date: 2026-11-01
Reviewed code baseline: `a146322`

## Current verdict and scope

**Estimated readiness: 75/100. The 80% shipping threshold is not yet met.**

80% means a robust, fully playable release within the agreed solo scope, with only assessed minor issues remaining. 100% means the fully intended game with all planned features. Readiness is determined by demonstrated behavior, not the number of checked tasks.

This document contains current issues and outstanding release qualifications, plus the TASK-01 and TASK-03 completion records. Other resolved historical issue descriptions and implementation journals have been removed. Existing behavior directly connected to an open issue is retained under that issue as a regression requirement. Original issue IDs are retained for continuity; gaps in numbering are intentional. Do not interpret a missing historical issue as unfinished work.

The launch case is **The Glasshouse Files / ملفات غلاسهاوس**. Existing local browser evidence covers the corrected case in Arabic on desktop Chromium, including a perfect solve, failure outcomes, tab recovery, HTTP recovery, worker restart and subsequent play. It does not establish every branch, mobile support, full browser-process reopening, deployed realtime delivery or intended-host operation.

### Verified baseline

These results include the final TASK-03 implementation checks (working tree based on `e0d44a0`):

| Check | Result |
| --- | --- |
| Backend suite | 496 tests: 495 passed, 1 skipped; 3,226 assertions; no failures/errors |
| Separate operational suite | Passed: 1 test / 19 assertions, including owned worker restart and isolated database/media restoration |
| Frontend suite | 150 passed across 26 files |
| Frontend lint | Passed |
| Frontend production build | Passed; approximately 980 KB minified JavaScript / 307 KB gzip |
| Unfinished-case restart | Fixed; 13 focused backend tests / 112 assertions, frontend confirmation/API regressions and six local MySQL checks; browser check waived by the user |
| Initial-load and terminal-result recovery | Fixed; explicit Retry, authoritative statistics, terminal-room lookup without tab storage, automated regressions and local built-in-browser checks |

The bundle-size warning is a minor performance concern unless testing on the supported devices/connections shows a material gameplay problem. It is not an automatic launch blocker.

### Database and content policy

**The user does not require preservation of existing database data. A clean reset and repopulation with the Glasshouse case is an acceptable resolution path when that work is executed.** Compatibility with old room IDs, player history, saved sessions and legacy case records is not a release requirement. This replaces the previous requirement to preserve the current source-case database records during promotion.

The supplied source archive is:

`D:\Laravel\investigation-game\cases\the-glasshouse-files.zip`

It was inspected read-only during this documentation update:

- SHA-256: `89f5e81b537bac44be32d6972fd1970ed3aa6e2f00e36dccb28288cfeb44b149`.
- The root manifest contains 3 zones, 14 evidence entries and 9 characters.
- Its case has `is_published: false` and `min_player_XP: 50`.
- It matches the older authoring bundle recorded in `database/release-content/glasshouse-files/source.json`; it is not the verified corrected release bundle.

A database reset alone does not correct old case content, supply missing media, or publish a draft. ISSUE-09 defines what must be true after repopulation. The supplied archive must be retained as an available source until a replacement bundle has been verified. Disposal of old database data does not imply disposal of the only usable case assets or permission to affect an unrelated environment.

The content review above did not perform a reset, import or deployment. The subsequent TASK-01 implementation and verification are recorded below.

## 1. Current issues

### ISSUE-01 — Restarting an unfinished case can retain the old encounter lock — Resolved

**Priority:** Gameplay release blocker.
**Evidence:** Source inspection and successful isolated reproduction of the failure.

**Issue and cause:** The briefing modal displays Restart Case when an active room exists. Its start handler creates another room and navigates to it without releasing or resolving the player's old encounter membership. Encounter entry correctly rejects a player who already belongs to an active encounter, regardless of which room owns it.

Reproduction: start a solo interrogation, return to the menu without explicitly abandoning it, choose Restart Case, and attempt to start the new interrogation. The new room is created, but entry fails with “Leave your current encounter before starting another.” The old room remains active. A player can reach the menu after closing/reopening the tab or using browser history.

**Why it needs fixing:** Restart is an offered product action. It must produce a playable investigation rather than a new room the player cannot use. Correct cleanup after a terminal verdict does not cover restarting an unfinished game.

**Connected behavior to preserve:** The old unload failure and terminal-verdict lock have already been corrected. Pagehide preserves a lone host's investigation, membership, accepted votes and deadlines; explicit abandonment performs cleanup; terminal verdicts release affected groups transactionally. Preserve these behaviors, multiplayer host migration, historical records in the new game, authorization, and the one-active-encounter invariant. Current active rooms survive pruning indefinitely; terminal rooms are eligible after seven days. Routine reads do not extend retention.

The restart behavior must define what happens to the previous room and pending jobs, including shared-room implications. It must not implicitly destroy other participants' work or silently discard a solo investigation without the appropriate user-facing intent. Independent future games must work even though old database data is disposable for the one-time reset.

**Task — TASK-01:** Make restarting an unfinished investigation a complete, consistent lifecycle operation, with a usable new room and no leftover restriction from the previous attempt.

**Approved restart policy (2026-11-01):** The user chose confirmation followed by abandonment without an additional XP penalty. A shared-room restart leaves only the requesting player; remaining participants keep their investigation and the host migrates when necessary. An empty old room uses the existing terminal `failed` storage status and its encounter becomes `abandoned`; restart does not create or alter a `case_user` verdict, award XP, or change existing replay reductions. Historical results remain intact. Ordinary pagehide/refresh remains a separate continuity action.

**Implementation plan (2026-11-01):**

1. Apply the approved policy above; any further undocumented gameplay decision must be settled with the user before implementation.
2. Introduce an authenticated restart operation identified by the previous room's server-provided invite code, so it works without sessionStorage. Authorize participation on the server and lock the player and previous room before changing membership. Reject unrelated active-encounter conflicts without modifying either investigation.
3. Run previous-attempt cleanup and new-room initialization in one database transaction. Reuse the existing encounter departure and host-migration behavior where it matches the approved policy. Preserve completed history and other participants' progress. Roll back every change if initialization or cleanup fails.
4. Persist the replacement-room identity for each requesting player and source room. Duplicate submissions and retries after a lost response must return the same replacement without restarting it again; stale or unauthorized requests must not create extra rooms.
5. Add a localized, keyboard-accessible confirmation explaining the approved previous-attempt and XP consequences. Cancellation changes nothing. Disable concurrent actions while the request runs, retain a usable error/retry path, and refresh relevant room/case caches after success.
6. Cover restart during an active interrogation and pending finalization, lost-response retries, repeated clicks, direct-request authorization, rollback, unrelated memberships, historical rewards, and the approved shared-room policy. Deliver old delayed jobs repeatedly and prove they cannot mutate the replacement or duplicate outcomes.
7. Verify the normal UI path from the menu and after reopening without tab storage; recheck refresh/resumption, explicit abandonment, terminal cleanup, subsequent play, and host migration. Run focused regressions, the full backend/frontend suites, lint and build. Record actual evidence before checking acceptance items.

**Implementation and evidence:** `POST /api/rooms/restart` now authorizes and locks the source/player, performs departure and new-room creation transactionally, and uses the new `room_restarts` table to return the same replacement after duplicate submissions or a lost response. The menu uses server-discovered invite codes and localized confirmation; cancellation before submission changes nothing. Pending requests disable dismissal and duplicate actions, time out after 15 seconds, and expose a safe retry. After an uncertain response, returning to the refreshed case list avoids promising that the old attempt can still be continued. Existing create/replay paths remain available.

- Full backend suite after implementation: 494 tests, 493 passed / 1 existing symlink-permission skip, 3,157 assertions; no failures/errors. The skip remains ISSUE-07 and is unrelated to restart.
- Focused new backend regressions: 13 tests / 112 assertions covering pending/stale jobs, no-penalty rewards, idempotent retries, host/non-host shared departures, direct authorization, unrelated encounter conflicts, initialization and cleanup rollback, successive restarts, late pagehide isolation, source pruning and deleted-replacement retry protection. Existing continuity, terminal cleanup and migration tests pass in the full suite.
- Full frontend suite: 134 tests across 25 files passed. Seven new modal tests cover confirmation/cancellation, focus, pending dismissal, repeated clicks, failed/lost-response retry, English/Arabic copy and unchanged first-play/replay behavior; the API contract also has a new bounded-request regression.
- Frontend lint and production build passed. The existing bundle warning remains approximately 977 KB minified / 306 KB gzip.
- Separate operational suite passed: 1 test / 19 assertions, including real worker interruption/restart and isolated restoration.
- Local MySQL was started for verification; only `2026_11_01_000001_create_room_restarts_table` was applied. A six-check MySQL transaction verified pending-vote restart, membership release, usable replacement, idempotent retry and untouched verdict history; all synthetic writes were rolled back. The verification-owned database process was then shut down gracefully, restoring its initial stopped state. No reset or content replacement was performed.
- **Browser exception approved by the user:** Local browser access is unavailable due to a regional restriction. The user explicitly requested dropping that check. No new rendered-browser, visual-layout or physical tab-reopen result is claimed. TASK-01 is complete within this approved verification scope; unrelated host/content/browser qualifications under other tasks remain open.

**Successful-fix verification:**

- [x] Menu confirmation and restart/entry contracts pass DOM/API tests; real browser execution waived by the user.
- [x] Server discovery and restart work without sessionStorage in regressions; physical tab reopening waived by the user.
- [x] Restart with a vote awaiting finalization; old jobs cannot affect the new room or create duplicate outcomes.
- [x] Verify and record the intended previous-room behavior, including failure/cancellation and repeated-click handling.
- [x] Existing automated refresh/pagehide/disconnection continuity checks pass; new browser execution waived by the user.
- [x] Explicit abandonment, terminal verdict cleanup, subsequent play and multiplayer migration remain correct.
- [x] Backend membership invariants hold for direct requests, not only UI actions; failed operations leave consistent state.
- [x] Focused backend/frontend regressions, local MySQL checks and the operational suite pass; browser verification explicitly waived because of regional unavailability.

**Relevant files:** `investigation-game-frontend/src/pages/MainMenu/CaseBriefingModal/CaseBriefingModal.tsx`, `investigation-game-frontend/src/hooks/useRoomPageHide.ts`, `investigation-game-backend/app/Services/GameRoomService.php`, `investigation-game-backend/app/Services/EncounterGroupService.php`, `investigation-game-backend/app/Services/AssessmentService.php`.

### ISSUE-03 — Recovery does not cover first-load failures or restored result statistics completely — Resolved

**Priority:** Required reliability correction; missing result statistics are a minor presentation defect.
**Evidence:** Source inspection. These two edge cases were not independently browser-reproduced in the latest review.

**Issue A and cause — First room snapshot fails:** `useGameRoom` disables query retries and enables periodic refresh only when cached room data already exists with active status. If joining succeeds but the first snapshot fails, or a stored room ID is available but its initial read fails, there is no room data to enable polling. The UI shows an initial error. A later focus, visibility or online event can retry, but recovery of the backend while the same tab stays visible does not itself trigger a new request.

**Why it needs fixing:** An initial transient HTTP failure should not strand the player on an error screen after the service recovers. Network events do not necessarily fire when only the backend was unavailable. Recovery must cover both cached sessions and first reads.

**Issue B and cause — Result statistics are local state:** `GameRoom` initializes local `finalStats` from an asynchronously loaded room, normally before that room exists. Later HTTP snapshots do not update this state. A recovered terminal room can therefore display its end-game overlay without saved statistics when no callback or realtime event supplied them.

**Why it needs fixing:** The persisted outcome should render consistently after resumption and missed events. Players should see their actual award and result even when realtime delivery is unavailable. This does not imply that the backend result or XP was lost.

**Connected behavior to preserve:** Five-second visible active-room polling, 15-second read cancellation, shared in-flight refreshes, socket reconnection, deadline refresh and pending-confirmation feedback are implemented. Existing local worker/interruption checks and actual-case HTTP recovery have passed. Preserve read-only room snapshots, server-authoritative finalization, stale-deadline guards, duplicate-job protection and terminal cleanup.

Also preserve the corrected error semantics: a gameplay 403 retains valid authentication; an authoritative room-read denial hides protected data and stops recovery; a current protected-request 401 triggers controlled reauthentication. Recovery must never retry a permanent denial indefinitely. Actual per-participant `xp_awards`, replay reductions and final statistics must remain intact.

**Task — TASK-03:** Complete initial-load recovery and render final results from authoritative recovered state without weakening existing recovery, security or progression guarantees.

**Approved recovery policy (2026-11-01):** The user chose an explicit Retry button after a failed first snapshot or join, waiting for player action instead of automatically retrying first-load failures. Existing five-second visible polling after a successful snapshot remains. The user confirmed that the built-in browser works now; TASK-03 requires browser verification and does not inherit TASK-01's browser exception.

**Implementation plan (2026-11-01):**

1. Expose localized, keyboard-operable Retry for transient initial read/join failures. Keep joining separate from read refreshes, share in-flight reads, bound joins/reads to 15 seconds, cancel on room change/unmount, and stop retrying permanent failures without revoking valid authentication.
2. Render final statistics directly from the room cache shared by HTTP snapshots, authenticated mutation responses and realtime updates. Scope resolution messages to the current invite code so another room cannot inherit them. Preserve actual per-participant awards, including zero on replay.
3. Add focused hook, API and rendered-result regressions for both first-load paths, explicit retries, permanent denials, cancellation, room switching and HTTP-only terminal results. Exercise worker finalization and duplicate delivery against persisted results.
4. Verify real local browser recovery and restored results, distinguishing HTTP-only recovery from socket recovery. Run frontend tests/lint/build, backend regressions and the separate operational suite; record observed evidence and remove temporary verification fixtures/processes.

**Implementation and evidence (2026-11-01):**

- Transient first-read and join failures now expose a localized Retry button and wait for player action, including after online/focus/visibility events. A successful join is reused when retrying a read. Established active rooms retain visible five-second polling, cached progress on transient failure, shared in-flight refreshes and 15-second read cancellation. Joins also have a 15-second timeout and abort on departure/room change. Permanent errors do not offer or schedule repeated retries; authoritative 403 room reads hide protected data, while gameplay denial retains authentication and current-session 401 still triggers controlled sign-in.
- `GameRoom` renders `room.final_stats` from the shared room cache. Mutation/realtime results write to that cache, and later HTTP snapshots provide authoritative recovered statistics. Resolution messages are scoped to the invite code. Actual per-participant awards, including zero on replay, remain unchanged.
- A connected revisit defect was found and fixed: invite-code lookup now returns concluded rooms to their existing participants without adding membership or changing results/retention. New participants cannot join a terminal room. This permits a readable terminal room to reopen without sessionStorage.
- Filled missing English labels on the affected recovery, sign-in and result surfaces. The error panel uses readable text, a native keyboard-operable button, pending-state protection and localized menu navigation. Other game translations and gameplay rules were outside this correction.
- Focused frontend checks: 25 tests across the hook, rendered-room/result and API contract files passed. They cover both initial-load paths, deliberate retries, permanent failures, overlap/cancellation, room switching, HTTP-only terminal recovery, zero replay awards, reload/revisit and reconciliation of realtime results with HTTP. Existing socket-reconnection/listener-cleanup and request/authentication regressions pass in the full suite.
- New backend regressions: 2 tests / 69 assertions. With broadcasting disabled, a real database worker delivers a failing answer; duplicate delivery is harmless. Solved/failed HTTP snapshots and terminal invite lookup preserve stored statistics, distinct participant awards (900 for a first win versus 0 for a replay), best history, membership and retention timestamps; outsiders are rejected. Existing concluded-room, deadline, continuity, restart and progression checks pass.
- Final backend suite: 496 tests, 495 passed / 1 existing symlink-permission skip, 3,226 assertions; no failures/errors. The remaining skip is ISSUE-07. Final frontend suite: 150 tests across 26 files passed. Lint and production build passed; the existing bundle-size warning remains approximately 980 KB minified / 307 KB gzip. Separate operational suite: 1 test / 19 assertions passed, including worker interruption/restart and isolated restoration.
- **Actual browser evidence:** built-in Chromium at 1280×720, local frontend `127.0.0.1:5193`, isolated PHP 8.2.12/SQLite/database queue API on port 8093, working tree based on `e0d44a0`, synthetic recovery cases `QA0001`–`QA0003`. Fault injection affected only this isolated test environment. No reset/import of the application database or Glasshouse content was performed.
- In the browser, successful-join/failed-read and stored-ID/failed-read both waited after HTTP was restored, then recovered using keyboard Retry. A failed join also recovered with explicit Retry. Normal UI answers plus the real worker completed the initial interview; normal indictment closed the first case. Reload and a newly opened tab without stored room identity restored its saved four-minute result and actual `0 / 900` replay award. A separate UI answer produced a delayed worker failure; visible HTTP polling displayed its saved five-minute result and `0 / 900`, and reload preserved them. Switching to the next case showed no old result. Broadcasting was disabled throughout these checks, establishing HTTP-only recovery.
- Browser-injected 403 hid room content, removed Retry and remained stopped after fault removal; returning to the menu retained the authenticated account. A protected 401 displayed sign-in, and normal sign-in resumed the same room. English and Arabic recovery controls and the recovered result surfaces were visually checked. Realtime reconnection and terminal-event reconciliation were checked separately in automated tests; actual deployed private-channel delivery remains TASK-08. This local browser evidence does not qualify physical mobile devices, full browser-process reopening, production hosting or installed Glasshouse content.
- Screenshots are retained under `C:\Users\ASUS\.codex\visualizations\2026\11\01\01a198a8-9bd0-76c1-b357-84c10739eb03\task03`. Temporary fixture scripts, logs, database and owned servers are removed after verification; only reviewable screenshots remain.

**Successful-fix verification:**

- [x] With no cached snapshot, fail the initial read, restore HTTP while the tab stays visible and observe successful automatic recovery or an explicit usable retry control.
- [x] Exercise both successful-join/failed-read and stored-ID/failed-read paths.
- [x] Verify failed joins remain recoverable and retries do not repeatedly mutate room membership.
- [x] Recovery requests remain bounded, do not overlap needlessly, and clean up timers/listeners on unmount or room change.
- [x] A 403 denial stops protected recovery and retains login; actual authentication expiry leads to sign-in and recovery as intended.
- [x] With realtime blocked, complete or fail a case through the worker, then verify the end screen displays persisted statistics and the viewing player's actual XP award.
- [x] Reload or revisit a readable terminal room and verify the same statistics; switching rooms does not reuse the previous game's result.
- [x] Existing visible-tab reconnection, cached-progress retention, overdue feedback, worker restart, duplicate delivery and terminal-state regressions still pass.
- [x] Browser and automated checks distinguish initial failure recovery, HTTP-only terminal recovery and realtime recovery.

**Relevant files:** `investigation-game-frontend/src/hooks/useGameRoom.ts`, `investigation-game-frontend/src/pages/GameRoom/GameRoom.tsx`, `investigation-game-frontend/src/pages/GameRoom/GameRoomLayout.tsx`, `investigation-game-frontend/src/pages/GameRoom/components/GameEffects/GameEndOverlay.tsx`, `investigation-game-frontend/src/services/request.ts`.

### ISSUE-07 — Filesystem ownership security test still cannot execute

**Priority:** Outstanding security verification.
**Evidence:** Latest backend suite skipped `MediaOwnershipTest::test_symlink_escape_cannot_authorize_reads_or_deletes` because the current Windows process cannot create a symlink.

**Issue and cause:** The test cannot establish whether a link inside the owned case-media directory can authorize reading/exporting or deleting a target outside that directory. Other traversal and ownership checks pass, but do not execute this filesystem behavior. This is an environment limitation, not a demonstrated vulnerability.

**Why it needs verification:** Filesystem ownership checks protect files beyond the case's assets. A clean test exit with this skip does not prove the missing behavior.

**Connected behavior to preserve:** The old username-fixture errors, invalid PNG fixture, countdown purity error and Campaign dependency warning are resolved. Keep their tests and current coverage; do not revive those resolved issues or weaken checks to obtain a clean run.

**Task — TASK-07:** Execute the symlink ownership test in an appropriate environment, resolve any real defect it exposes, and establish a passing automated baseline with no essential behavior hidden by skips.

**Successful-fix verification:**

- [ ] Execute the named test on a filesystem/process that supports the required symlink; record environment and assertion results.
- [ ] Confirm export/read is denied and the external target survives attempted deletion.
- [ ] Run the complete backend suite in that environment and document any remaining skips individually.
- [ ] Keep traversal, provider ownership, shared-media retention and normal authorized export/delete checks passing.
- [ ] Frontend tests, lint and production build remain clean on the release revision.

**Relevant file:** `investigation-game-backend/tests/Feature/Admin/MediaOwnershipTest.php`.

### ISSUE-08 — Intended-host operation and security remain unqualified

**Priority:** Release qualification blocker.
**Evidence:** No intended host is selected in the current operational documentation. Local tests and a synthetic restore drill pass; they are not host evidence.

**Issue and cause:** Worker supervision, delivered operational alerts, production database behavior, private-channel delivery, effective TLS/proxy/cache settings, scheduled maintenance and deployment persistence have not been demonstrated together on the intended host. Public authentication protection is implemented, but its host enforcement remains unverified and is consolidated here from the former ISSUE-04.

**Why it needs verification:** A correctly implemented game can still stall if workers are absent, lose media on replacement, accept incorrect proxy identities, or reset rate-limit counters across application instances. These are basic operating requirements for a robust small launch.

**Connected behavior to preserve:**

- Login limits: 30/minute/IP and 5/minute/normalized-email-and-IP. Registration: 5/minute/IP and 20/hour/IP. HMAC identifiers, 429 retry metadata and independent frontend cooldowns are implemented; successes do not reset counters.
- Pagehide continuity, terminal encounter cleanup, HTTP recovery, concluded-room mutation rejection and duplicate-job guards already have local regression coverage.
- The operational suite uses separate PHP workers, private SQLite/database queue/cache, synthetic media and isolated restoration. It passed 1 test / 19 assertions in the latest review.
- `scripts/operations-status.php` reports failed jobs and overdue encounters, with bounded returned IDs. An empty queue does not prove that an idle worker is alive.
- Active investigations are retained indefinitely; terminal rooms may be pruned after seven days. Preserve this approved policy and account for active-room storage growth.

**Task — TASK-08:** Qualify the selected host with the actual release application/content, including persistent operation, authentication controls and recovery procedures. Legacy database preservation is not required for initial repopulation; recoverability of player data created after launch remains required.

**Successful-fix verification:**

- [ ] Record supported launch devices/browser, host topology, database, queue, broadcasting provider, persistent storage, proxy trust, process manager and operator responsibilities without exposing secrets.
- [ ] Demonstrate real delayed progression, owned worker interruption/restart, supervisor restart and actionable failed-job/worker-outage notification.
- [ ] Verify authorized private-channel subscription and event receipt, unauthorized rejection and browser recovery with sockets blocked but HTTP available.
- [ ] Verify authentication limits across requests, host restarts and replicas where applicable, with persistent/shared counters and genuine client identity behind the actual proxy.
- [ ] Verify secure frontend/API/realtime URLs, generic client errors and protected useful diagnostics.
- [ ] Verify actual scheduled invocation and room/token retention behavior.
- [ ] Demonstrate deployment/restart preserves database and required media; validate image/container permissions if that deployment route is selected.
- [ ] Restore representative post-launch-style progress plus local/external media into an isolated host-matched environment and continue play through the normal interface.
- [ ] Record backup cadence/retention, recovery expectations, failure response owner and observed recovery results.
- [ ] Verify session expiry/sign-in recovery and browser-process close/reopen on the agreed supported browser scope.
- [ ] Run representative gameplay on the intended host without severe loading stalls or timeouts.

**Relevant files:** `investigation-game-backend/README.md`, `investigation-game-backend/scripts/operations-status.php`, `investigation-game-backend/tests/Operations/RecoveryTest.php`, `investigation-game-backend/app/Providers/AppServiceProvider.php`, `investigation-game-backend/config/queue.php`, `investigation-game-backend/config/broadcasting.php`, `investigation-game-backend/routes/console.php`, `investigation-game-backend/app/Models/GameRoom.php`.

### ISSUE-09 — The database must receive the verified Glasshouse content, with a consistent entry policy

**Priority:** Content release blocker; entry policy also needs clarification.
**Evidence:** The prior playthrough used corrected isolated content. The latest review did not independently query the current source database. The supplied authoring ZIP was inspected during this update and is the older draft bundle.

**Issue and cause:** Application changes and a corrected checked-in manifest do not replace case rows already in the database. Import is add-only and rejects a duplicate title. The previously recorded source case still had original defects, whereas automated playability tests import the corrected release manifest.

The user now permits discarding old data and clean repopulation. An in-place legacy migration is not required. However, blindly importing the supplied ZIP would restore its old graph and draft publication flag; flushing does not itself resolve those differences.

**Why it needs fixing:** The game served to players must contain the same playable content that was verified. A passing test of another manifest cannot establish that the imported case is solvable or even visible in case discovery.

**Connected content corrections to preserve within this issue:**

- L01 ledger → call → resolved-ledger navigation previously trapped the encounter. The corrected graph uses a separate return prompt; interrogation-cycle validation must remain effective.
- L04 previously made Watts and Voss/rooftop mutually exclusive, preventing discovery of all six guilty characters. Preserve the corrected desk-owner discovery and intended deceased/fled states.
- Unlock-only character updates must not assign a null runtime status after import/export.
- Completed procedural requests must unlock the intended level through authoritative completed-request IDs.
- Final indictment readiness must not require a completion pivot that location exploration never creates. Keep interrogation requirements, suspect possession and vital-proof assessment.
- Preserve reactive production-build sign-in, actual per-player XP awards, replay/best-result rules, minute-duration display, terminal cleanup and HTTP recovery.
- Evidence 04's absent audio was explicitly excluded from required playable media as a board-design placeholder. Do not claim that recording was tested or silently make it mandatory.

**Source compatibility:** The existing `scripts/release-content/build-glasshouse-release.php` expects the reviewed database export and its media hashes recorded in `source.json`. It does not accept any arbitrary Glasshouse ZIP. The supplied authoring bundle has a different hash, manifest and media layout from that reviewed export. Source assets and corrected references must be reconciled and verified rather than bypassing integrity checks or assuming paths match.

**Entry-policy discrepancy:** The manifest declares 50 minimum XP, while registration grants 0 XP. Contrary to the previous note, current code does not enforce that minimum: the card adds a visual class, the start button remains available, and backend creation has no XP check. Do not document new players as definitively blocked. Define one consistent launch policy and prove a fresh account has an intended route into the sole launch case; enforcing 50 XP without an earning route would create a real onboarding blocker.

**Task — TASK-09:** Establish a reproducible, published and playable Glasshouse installation from verified case assets and corrected content, with a consistent entry policy. A clean reset/repopulation is permitted; preserving historical database data is unnecessary.

**Successful-fix verification:**

- [ ] Record the source ZIP, corrected manifest, asset inventory and final bundle/content identity used for repopulation.
- [ ] Verify the fresh database has the intended published Glasshouse case and corrected graph, with no stale duplicate or unintended draft serving as the launch case.
- [ ] Verify every referenced required asset exists and renders; retain usable source assets until replacement validation succeeds.
- [ ] Register a fresh account and enter through normal discovery and UI using the agreed XP policy; do not rely only on a pre-credited fixture.
- [ ] Complete the case through the actual application, queue and supported browser after repopulation; no direct gameplay API calls or database edits substitute for player actions.
- [ ] Exercise both tested L01 routes and verify all six guilty characters and three vital proofs are reachable with intended statuses.
- [ ] Exercise required procedural requests, location points, dialogue branches and final indictment interactions.
- [ ] Verify perfect, relevant failure and partial/replay outcomes through an appropriate mix of browser and focused automated coverage; document which outcomes were observed where.
- [ ] Verify actual XP, final statistics, best history, restart/subsequent play and the recovery corrections from ISSUE-01/ISSUE-03.
- [ ] Re-run the authored-case regression suite against the content actually selected for installation; a different synthetic or corrected manifest alone is insufficient.
- [ ] Record the final host/revision/content combination and remaining minor limitations.

**Relevant sources:** `cases/the-glasshouse-files.zip`, `investigation-game-backend/database/release-content/glasshouse-files/case.json`, `investigation-game-backend/database/release-content/glasshouse-files/source.json`, `investigation-game-backend/scripts/release-content/build-glasshouse-release.php`, `investigation-game-backend/app/Services/Case/CaseImportService.php`, `investigation-game-backend/tests/Feature/GlasshousePlayabilityTest.php`, `investigation-game-frontend/src/pages/MainMenu/CaseCard/CaseCard.tsx`, `investigation-game-frontend/src/pages/MainMenu/CaseBriefingModal/CaseBriefingModal.tsx`.

## 2. Active task checklist

- [x] **TASK-01:** Resolve unfinished-case restart and verify connected continuity/encounter lifecycle behavior; completed under the user-approved browser exception documented above.
- [x] **TASK-03:** Complete first-load recovery and authoritative terminal-statistics rendering, including explicit Retry, terminal revisits without tab storage, browser HTTP-only recovery and authentication checks.
- [ ] **TASK-07:** Execute the skipped filesystem-security behavior and confirm the release test baseline.
- [ ] **TASK-08:** Demonstrate host operation, deployed authentication protection, persistence and restoration.
- [ ] **TASK-09:** Install and verify corrected published Glasshouse content, using the approved disposable-data policy, and settle the entry policy.

TASK-01 and TASK-03 are retained here with their completion evidence. Other resolved standalone tasks are omitted. Their connected invariants are retained under the open issues above; they must remain covered when those issues change.

## 3. Final 80% acceptance

The current passing automated baseline is recorded above. It must be repeated on the final release revision after the remaining changes.

- [ ] All active tasks have specific implementation and verification evidence, with no remaining gameplay blocker.
- [ ] A fresh account can enter and complete the installed launch case through the supported interface.
- [ ] Refresh, tab/browser reopening, initial HTTP failure, visible-tab recovery and pending finalization preserve correct progress.
- [ ] Restart, explicit abandonment, terminal cleanup and subsequent play leave consistent memberships and rewards.
- [ ] Recovered end screens show persisted results and the correct player's actual award.
- [ ] Direct gameplay requests cannot mutate concluded rooms or bypass resource authorization; permission failures retain valid sessions and real expiry is recoverable.
- [ ] Final frontend/backend tests, operational checks, lint and build pass; essential skipped coverage has been executed.
- [ ] The intended host demonstrates worker/scheduler operation, realtime authorization, public authentication controls, persistent storage and a playable restore.
- [ ] Final browser evidence identifies the code revision, installed content version, host and supported device/browser scope.
- [ ] Remaining issues are explicitly assessed as minor: they do not block completion, unexpectedly lose progress, lock subsequent games, compromise essential security or defeat the verified recovery behavior.

**Sign-off:** 80% is reached when this evidence exists for the installed release. A reset, a successful import, a green build or a single uninterrupted solve alone does not establish it. Old pre-launch data may be discarded; new player progress must be reliable after launch.
