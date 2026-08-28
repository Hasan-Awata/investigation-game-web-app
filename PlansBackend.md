Prompt 20: API Security, Auth, & FormData (Issues 1, 5, 9)
Copy and paste this into your AI coding assistant:

[SYSTEM DIRECTIVES & ROLE]
You are a Senior Full-Stack API Security Expert.

No Shortcuts: Do not use placeholders like .... Write complete, production-ready code.

Architecture Mandate: Enforce strict Route-Model scoping, robust session verification, and proper HTTP method handling for multipart/form-data.

[THE PROBLEM: API VULNERABILITIES & FORM DATA BLACKHOLES]

FormData PUT Blackhole: useAdminMutations.ts sends FormData via PUT, but PHP/Laravel natively discards multipart/form-data on PUT requests, resulting in empty payloads.

Insecure Admin Guard: App.tsx relies on localStorage to grant admin access, allowing malicious users to bypass the frontend router.

Unscoped Route Bindings: GameRoomController.php accepts cross-contaminated parameters. A host can pass a Level ID from a completely different Case into their room, corrupting the progression track.

[THE OBJECTIVES]

Method Spoofing: In useAdminMutations.ts, refactor the updateMutation to send a POST request with _method=PUT appended to the FormData to bypass the PHP limitation.

Secure Hydration: In routes/api.php, create a GET /api/user endpoint returning $request->user(). Refactor App.tsx to fetch this on mount, using the server's response to authorize <AdminGuard/> instead of localStorage.

Strict Scoping: In GameRoomController.php (e.g., startLevel), add authorization guards: if ($level->phase->case_id !== $room->case_id) { return response()->json([...], 409); }.

[EXECUTION WORKFLOW]
Provide the fully refactored, complete code blocks for useAdminMutations.ts, routes/api.php, App.tsx, and GameRoomController.php.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of useAdminMutations.ts, routes/api.php, App.tsx, and GameRoomController.php here)

Prompt 21: Query Optimization & Payload Reduction (Issues 3, 4, 7)
Copy and paste this into your AI coding assistant:

[SYSTEM DIRECTIVES & ROLE]
You are a Senior Laravel Performance Architect.

No Shortcuts: Write complete, fully functional file replacements.

Architecture Mandate: Eliminate N+1 queries. Never over-fetch data. Broadcasts must be consolidated to prevent frontend refetch storms.

[THE PROBLEM: THE GOD PAYLOAD & N+1 QUERIES]

The "God Payload": GameRoomController::show() and AdminCaseController::index() eager-load incredibly deep relationships, sending the entire game's solution tree to the browser, ballooning memory and exposing spoilers.

Event Fragmentation: VotingService.php dispatches EvidenceDiscovered, SuspectDiscovered, and VoteLockedIn simultaneously, forcing the React frontend into redundant, concurrent state updates.

N+1 Query: AssessmentService::evaluateSubmission() loops through $votes and executes Choice::find($vote->choice_id) inside the loop, crushing the database under load.

[THE OBJECTIVES]

Mask Data: Refactor GameRoomController::show() using Laravel Eloquent Resources to strictly serialize only the currentLevel and explicitly unlocked entities. Remove deep eager loading from AdminCaseController::index().

Event Consolidation: Create a new RoomStateUpdated event. Refactor VotingService.php to dispatch this single event containing all mutated arrays (votes, unlocked IDs) so the frontend can patch its cache once.

Eager Loading: In AssessmentService.php, eager load the choices: RoomVote::with('choice')->where(...).

[EXECUTION WORKFLOW]
Provide the fully refactored code blocks for GameRoomController.php, AdminCaseController.php, VotingService.php, and AssessmentService.php. Include the new RoomStateUpdated.php event class.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of GameRoomController.php, AdminCaseController.php, VotingService.php, and AssessmentService.php here)

Prompt 22: Database Integrity & Orphaned Media (Issues 6, 8, 10)
Copy and paste this into your AI coding assistant:

[SYSTEM DIRECTIVES & ROLE]
You are a Senior Laravel Database & Storage Architect.

No Shortcuts: Write complete, production-ready code.

Architecture Mandate: Prevent destructive cascades. Automate cleanup tasks using Eloquent Observers.

[THE PROBLEM: DESTRUCTIVE CASCADES & ORPHANED MEDIA]

Destructive Cascades: AdminQuestionController::update() drops and re-inserts choices. Because room_votes uses cascadeOnDelete for choice_id, updating a typo in a choice silently wipes out every player's vote for that question globally.

Orphaned Media: If an admin deletes a Phase, the database cascades deletions down to Levels and Questions, bypassing the deleteMedia() controller logic and stranding gigabytes of media on the server.

Rigid Media: Admin controllers have no mechanism to remove an image without uploading a replacement.

[THE OBJECTIVES]

Upsert Strategy: Refactor AdminQuestionController::update() to use updateOrCreate on choices. Only delete choices that are explicitly missing from the incoming request.

Eloquent Observers: Create LevelObserver, QuestionObserver, and EvidenceObserver. Move the deleteMedia() logic into their deleting hooks so media is automatically purged during database cascades. Register them in AppServiceProvider.

Nullable Media: Add a remove_image boolean flag to the validation arrays in the Admin Controllers. If true, trigger media deletion and set the column to null.

[EXECUTION WORKFLOW]
Provide the new Observer classes and AppServiceProvider.php. Then, provide the refactored AdminQuestionController.php and an example of the updated media logic in AdminEvidenceController.php.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of AppServiceProvider.php, AdminQuestionController.php, and AdminEvidenceController.php here)

Prompt 23: Stateful Progression & Anti-Cheat (Issue 2)
Copy and paste this into your AI coding assistant:

[SYSTEM DIRECTIVES & ROLE]
You are a Senior Full-Stack State Synchronization Expert.

No Shortcuts: Write complete, fully functional file replacements.

Architecture Mandate: Progression state must be authoritative on the server. Avoid relying on transient WebSockets (whispers) or sessionStorage for permanent game state.

[THE PROBLEM: THE WHISPER / SESSIONSTORAGE TRAP]
The game relies on frontend sessionStorage and Reverb whispers to track which location points and dead-ends a player has clicked. If the room disconnects or the user switches devices, all location progression is wiped permanently, allowing players to reset penalties instantly.

[THE OBJECTIVES]

Database Tracking: Create a migration for a room_inspections pivot table (id, room_id, choice_id, is_dead_end, timestamps).

Backend Endpoint: Create a POST /rooms/{room}/inspect/{choice} endpoint in GameRoomController.php that saves the inspection to the database and broadcasts a LocationInspected event.

Frontend Mutation: In LocationPhase.tsx, completely remove sessionStorage and Echo.whisper. Replace them with a TanStack Query useMutation that fires the new endpoint while using onMutate to optimistically update the UI instantly.

[EXECUTION WORKFLOW]
Provide the migration file for room_inspections, the new LocationInspected event, the refactored GameRoomController.php, and the refactored LocationPhase.tsx.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of GameRoomController.php and LocationPhase.tsx here)
=================================================================================================================================
Prompt 16: Backend Deployment & Storage Abstraction (Issues 1 & 6)
Copy and paste this into your AI coding assistant:

[SYSTEM DIRECTIVES & ROLE]
You are a Senior Laravel DevOps & Systems Architect.

No Shortcuts: Do not use placeholders. Write complete, production-ready code.

Architecture Mandate: The application must be deployment-ready. Configuration caching must not break the app, and the filesystem must rely on Laravel's abstract Storage facade to allow seamless cloud migrations.

[THE PROBLEM: DEPLOYMENT & STORAGE FLAWS]

The env() Trap: HandlesMedia.php accesses Cloudinary credentials using env(). In production, running php artisan config:cache causes env() calls outside configuration files to return null, which will instantly break all cloud uploads.

Raw PHP Deletions: HandlesMedia.php uses raw PHP functions like file_exists and @unlink($fullPath). This tightly couples the code to the local filesystem and violates Laravel's abstraction layers.

[THE OBJECTIVES]

Config Migration: Map the Cloudinary environment variables into the config/services.php array.

Refactor Trait: Update HandlesMedia.php to access these credentials using the config() helper instead of env().

Storage Facade: Replace the raw PHP @unlink logic with Storage::disk('public')->delete(...).

[EXECUTION WORKFLOW]
Briefly explain why env() fails in production when config caching is enabled. Then, provide the fully refactored, complete code blocks for config/services.php and HandlesMedia.php.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of config/services.php and HandlesMedia.php here)

Prompt 17: Frontend Memory Leaks & Dependency Thrashing (Issues 2 & 4)
Copy and paste this into your AI coding assistant:

[SYSTEM DIRECTIVES & ROLE]
You are a Senior React.js Performance Expert.

No Shortcuts: Write complete, fully functional file replacements.

Architecture Mandate: Prevent memory leaks, rogue background processes, and unnecessary component unmounting/remounting.

[THE PROBLEM: MEMORY LEAKS & THRASHING]

WebSocket Thrashing: In GameRoom.tsx, the useEffect that connects to Laravel Echo includes refreshRoomData in its dependency array. Because useGameRoom.ts returns this function without memoizing it, its reference changes on every render, causing the WebSocket to constantly tear down and reconnect.

Rogue Audio: When the WiretapTriggered event fires, const audio = new Audio(...) is instantiated and played. If the player leaves the room, this audio continues playing indefinitely because it is not tracked or destroyed on unmount.

[THE OBJECTIVES]

Memoize Callbacks: In useGameRoom.ts, wrap the returned refreshRoomData function in a useCallback to stabilize its reference.

Track Audio References: In GameRoom.tsx, store the active audio instance inside a useRef<HTMLAudioElement null |>(null).

Cleanup Function: Add a cleanup return function to the useEffect in GameRoom.tsx that explicitly calls audioRef.current?.pause() and severs the WebSocket connection.

[EXECUTION WORKFLOW]
Provide the fully refactored, complete code blocks for useGameRoom.ts and GameRoom.tsx.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of useGameRoom.ts and GameRoom.tsx here)

Prompt 18: Backend Race Conditions & Zombie Gameplay (Issues 3 & 5)
Copy and paste this into your AI coding assistant:

[SYSTEM DIRECTIVES & ROLE]
You are a Senior Backend Security & Concurrency Engineer.

No Shortcuts: Write complete, production-ready code.

Security Mandate: Prevent race conditions under heavy load and strictly enforce state machine transitions.

[THE PROBLEM: RACE CONDITIONS & ZOMBIE STATE]

Database Race Conditions: In WiretapController::play, the code checks exists() before calling attach(). If a host double-clicks, two requests bypass the check simultaneously, throwing a fatal HTTP 500 QueryException due to a unique constraint violation on the pivot table.

Zombie Gameplay: Controllers like GameRoomController, VoteController, and InvestigationRequestController do not check if the room is actually Active. Players can maliciously trigger events in a room that is already Solved or Failed.

[THE OBJECTIVES]

Concurrency Fix: Refactor WiretapController.php to use syncWithoutDetaching() instead of checking exists() and attach(), allowing the database to natively swallow duplicate inserts gracefully.

State Gatekeepers: Inject a strict status guard (if ($room->status !== RoomStatus::Active)) at the top of the relevant gameplay methods in GameRoomController.php, VoteController.php, and InvestigationRequestController.php. Return an HTTP 409 Conflict if violated.

[EXECUTION WORKFLOW]
Provide the fully refactored, complete code blocks for WiretapController.php, GameRoomController.php, VoteController.php, and InvestigationRequestController.php.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of the four controllers here)

Prompt 19: Dynamic Internationalization (i18n Conflict) (Issue 7)
Copy and paste this into your AI coding assistant:

[SYSTEM DIRECTIVES & ROLE]
You are a Senior Frontend Engineer focusing on internationalization (i18n).

No Shortcuts: Write complete, fully functional file replacements.

Architecture Mandate: The application layout must respond dynamically to the active language direction (RTL vs LTR).

[THE PROBLEM: HARDCODED RTL]
index.html currently has dir="rtl" hardcoded onto the <html> tag. While the game forces Arabic currently, supporting English or other LTR languages in the future will result in a completely broken flexbox layout, as the DOM will remain forced into Right-To-Left rendering.

[THE OBJECTIVES]

Clean the DOM: Remove the hardcoded dir="rtl" and lang="ar" attributes from index.html.

Dynamic Binding: Open App.tsx and implement a useEffect that listens to i18n.language. It must dynamically set document.documentElement.dir = i18n.dir(); and document.documentElement.lang = i18n.language; so the browser layout engine updates automatically.

[EXECUTION WORKFLOW]
Provide the fully refactored, complete code blocks for index.html and App.tsx.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of index.html and App.tsx here)