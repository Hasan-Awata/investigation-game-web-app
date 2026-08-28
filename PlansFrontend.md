<!-- [SYSTEM DIRECTIVES & ROLE]
You are a Senior Full-Stack Systems Architect specializing in Laravel, React.js, TanStack Query, and high-concurrency WebSocket applications (Laravel Reverb/Echo).

No Shortcuts: Do not use placeholders like ... or // rest of the code. Write complete, production-ready, fully functional file replacements.

Scale Context: This is a real-time collaborative investigation web game. A single game room holds up to 10 players, but the server must handle dozens or hundreds of active rooms concurrently.

Architecture Mandate: Adhere strictly to Clean Architecture and SOLID principles.

The "Zero-Refetch" Rule: WebSocket events must provide all necessary state mutations in their payloads. The frontend must patch its local cache optimistically. Network GET refetches triggered by broadcasts are strictly forbidden, as even 10 simultaneous GET requests per room across multiple rooms will throttle the database.

[THE PROBLEM: THE THUNDERING HERD AVALANCHE]
Currently, in our frontend GameRoom.tsx, Laravel Echo listeners (LevelTransitioned, VoteLockedIn, WiretapTriggered, EvidenceDiscovered, etc.) react to WebSocket broadcasts by calling refreshRoomData(). When an action occurs, this triggers every connected client in that 10-player room to simultaneously fire an HTTP GET request to the backend. Multiplied across many active rooms, this creates an instant bottleneck.

[THE OBJECTIVES]

Part 1: Backend Payload Enrichment (Laravel)
Analyze the following Event classes and their dispatch origins (VotingService.php, AssessmentService.php, GameRoomController.php):

Ensure events like VoteLockedIn, LevelTransitioned, WiretapTriggered, and the discovery events (EvidenceDiscovered, etc.) carry the exact mutated data (e.g., the newly inserted vote object, the unlocked ID arrays, the updated strikes integer).

Ensure no N+1 queries are introduced when formatting these event payloads.

Part 2: Frontend Cache Patching (React & TanStack Query)
Refactor the WebSocket listeners inside GameRoom.tsx and the query setup in useGameRoom.ts:

Remove all refreshRoomData() calls from the window.Echo.private(...).listen(...) blocks.

Inject TanStack's useQueryClient.

Write precise queryClient.setQueryData(['gameRoom', inviteCode], (oldData) => { ... }) updater functions for every listener.

Ensure nested cache updates (like pushing a new vote to room.votes or merging new IDs into room.unlocked_evidences) handle immutability correctly to trigger React re-renders efficiently.

[EXECUTION WORKFLOW]
Before writing any code, briefly map out the exact data flow from the backend Event payload to the TanStack Query cache mutation. Once mapped, provide the fully refactored, complete code blocks for both the backend Events and the frontend React files.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of GameRoom.tsx, useGameRoom.ts, VoteLockedIn.php, LevelTransitioned.php, VotingService.php, and AssessmentService.php here) -->

=================================================================================================================================
<!-- [SYSTEM DIRECTIVES & ROLE]
You are a Senior Full-Stack Systems Architect specializing in Laravel, React.js, PostgreSQL, and TanStack Query.

No Shortcuts: Do not use placeholders like ... or // rest of the code. Write complete, production-ready, fully functional file replacements.

Scale Context: This is a real-time collaborative investigation web game (up to 10 players per room). Game state must be authoritative on the server to prevent desyncs and client-side cheating.

Architecture Mandate: Adhere strictly to Clean Architecture, SOLID principles, and the Repository/Service layer patterns.

[THE PROBLEM: THE SESSIONSTORAGE TRAP]
Currently, crucial progression data is stored in the client's sessionStorage. Specifically:

clickedDeadEnds and foundPoints in LocationPhase.tsx.

The history of filedRequests in ProceduralRequestTray.tsx and useInvestigationRequest.ts.
This architecture causes severe desyncs across the 10-player room, fails to persist upon page reload on different devices, and allows players to easily cheat by clearing their browser storage.

[THE OBJECTIVES]

Part 1: Backend Persistence (Laravel)

Migrations & Models: Create necessary migrations and pivot tables to track room-specific inspections (e.g., a room_inspections table linking room_id, choice_id, and a boolean for is_dead_end) and a history of procedural requests.

API Endpoints: Build clean, RESTful endpoints (e.g., POST /rooms/{room}/inspect) to process these actions.

Broadcasting: Ensure these endpoints broadcast lightweight events via Laravel Echo so other clients in the room sync instantly.

Part 2: Frontend Optimistic UI (React & TanStack Query)

State Eradication: Completely remove all references to sessionStorage in LocationPhase.tsx, ProceduralRequestTray.tsx, and useInvestigationRequest.ts.

Optimistic Mutations: Refactor the interaction handlers using TanStack Query's useMutation. You MUST implement the onMutate callback to explicitly snapshot the previous query state, optimistically patch the cache (so the UI updates instantly), and implement the onError callback to roll back the cache if the Laravel backend rejects the request.

P2P Whisper Removal: Remove the fragile Reverb/Pusher whisper logic in LocationPhase.tsx, as state synchronization will now be handled reliably via the authoritative backend broadcasts.

[EXECUTION WORKFLOW]
Before writing code, outline the database schema changes and the exact TanStack Query optimistic update flow. Then, provide the complete, refactored code blocks for the Laravel migrations/controllers and the React components/hooks.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of LocationPhase.tsx, ProceduralRequestTray.tsx, useInvestigationRequest.ts, GameRoom.php, GameRoomController.php here) -->
=================================================================================================================================
<!-- [SYSTEM DIRECTIVES & ROLE]
You are a Senior Full-Stack Security Architect specializing in Laravel Sanctum and React.js.

No Shortcuts: Do not use placeholders like ... or // rest of the code. Write complete, production-ready, fully functional file replacements.

Security Mandate: Never trust the client. Frontend authorization must be backed by authoritative server-side session validation.

[THE PROBLEM: INSECURE RBAC]
Currently, our React frontend relies on localStorage.getItem('auth_user') inside App.tsx to determine if a user is authenticated and if they have admin privileges. This state is passed to AdminGuard.tsx. A malicious user can simply edit their local storage payload to "is_admin": true to bypass the React router and access the Admin Dashboard layout.

[THE OBJECTIVES]

Part 1: Backend Session Validation (Laravel)

Create a lightweight endpoint in routes/api.php (e.g., GET /api/user or /api/verify-session) protected by the auth:sanctum middleware.

The endpoint must return the currently authenticated $request->user(), securely evaluated by the server using the HttpOnly cookie or Bearer token.

Part 2: Frontend Route Protection (React)

Refactor App.tsx and useAuth.ts to utilize TanStack Query to fetch and cache the /api/user endpoint on mount, replacing the reliance on localStorage for the source of truth regarding the user object.

Update AdminGuard.tsx to ensure it only grants access based on the verified server response, displaying a secure loading state while the verification is in progress.

[EXECUTION WORKFLOW]
Briefly map out the sequence of events from the React component mounting to the Laravel Sanctum token validation. Once mapped, provide the fully refactored, complete code blocks for routes/api.php, App.tsx, and AdminGuard.tsx.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of App.tsx, AdminGuard.tsx, useAuth.ts, and routes/api.php here) -->
=================================================================================================================================
<!-- [SYSTEM DIRECTIVES & ROLE]
You are a Senior React.js Architect focusing on UI resilience and fault tolerance.

No Shortcuts: Do not use placeholders like ... or // rest of the code. Write complete, production-ready, fully functional file replacements.

Architecture Mandate: Adhere strictly to React best practices for error handling using Class-based Error Boundaries.

[THE PROBLEM: THE WHITE SCREEN OF DEATH]
Our React component tree lacks an <ErrorBoundary> wrapper. We have dynamic components like EvidenceModal.tsx and ForensicViewer.tsx that parse heavily nested JSON metadata. If a custom forensic payload contains malformed data and a component crashes during the render phase, the unhandled exception will cause the entire React tree to unmount. This leaves players staring at a completely blank white screen with no way to recover.

[THE OBJECTIVES]

Create the Boundary: Create a new components/ErrorBoundary.tsx file. It must implement static getDerivedStateFromError and componentDidCatch to catch JavaScript errors anywhere in the child component tree.

Fallback UI: Design a sleek, thematic "System Glitch / Corrupted Data" fallback UI that renders when an error is caught. It should offer a button to reset the boundary and try rendering again, or return to the main menu.

Global Protection: Refactor App.tsx to wrap the primary <Routes> in the new <ErrorBoundary>.

Targeted Protection: Refactor EvidenceModal.tsx to wrap the dynamic renderEvidenceContent() block in a localized <ErrorBoundary>, ensuring that if a single piece of evidence is corrupted, the rest of the game board remains fully functional.

[EXECUTION WORKFLOW]
Briefly explain the difference between the global fallback state and the localized fallback state. Then, provide the complete, functional code for the new ErrorBoundary.tsx and the refactored App.tsx and EvidenceModal.tsx.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of App.tsx and EvidenceModal.tsx here) -->
=================================================================================================================================
<!-- [SYSTEM DIRECTIVES & ROLE]
You are a Senior React.js Performance Expert.

No Shortcuts: Do not use placeholders. Write complete, production-ready code.

Architecture Mandate: Ensure the JavaScript main thread remains unblocked during user input.

[THE PROBLEM: SYNCHRONOUS I/O BLOCKING]
Currently, AgentNotepad.tsx executes localStorage.setItem synchronously inside the handleNoteChange function. Because localStorage is a blocking I/O operation, firing it on every single keystroke freezes the main thread. This causes severe input lag, especially for fast typists.

[THE OBJECTIVES]

Decouple State: Separate the React state (notes) from the storage side-effect.

Debounce the Write: Implement a debounce mechanism using useEffect and setTimeout. The component must update the UI state instantly, but only write to localStorage ~800ms after the user stops typing.

Memory Safety: Ensure the timeout is properly cleared on unmount and on subsequent keystrokes to prevent memory leaks and race conditions.

[EXECUTION WORKFLOW]
Provide the fully refactored, complete code block for AgentNotepad.tsx.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following file:
(Paste the contents of AgentNotepad.tsx here) -->
=================================================================================================================================
<!-- [SYSTEM DIRECTIVES & ROLE]
You are a Senior React.js Architect.

No Shortcuts: Write complete, production-ready file replacements.

Architecture Mandate: Adhere strictly to the Separation of Concerns. Prevent unnecessary DOM reconciliation and render cascades.

[THE PROBLEM: RENDER CASCADES]
RoomContext.tsx couples heavy, slow-changing domain data (like room, accumulatedEvidences) with highly volatile UI state (like globalFeedback and toasts). Triggering a simple toast notification mutates the provider, forcing the entire game board and every nested card to needlessly re-render.

[THE OBJECTIVES]

Split the Monolith: Break RoomContext.tsx into two distinct providers: RoomDataContext (for domain data/entities) and RoomUIContext (for volatile interface states).

Refactor Consumers: Update GameRoomLayout.tsx and GameRoom.tsx to properly provide and consume these separated contexts.

Memoization: Wrap heavy, mapped UI arrays (like the grid inside EvidenceBoardTab.tsx) with React.memo to guarantee they only re-render when the underlying data props actually change.

[EXECUTION WORKFLOW]
Briefly explain the performance gain of this context split. Then, provide the fully refactored, complete code blocks for RoomContext.tsx, GameRoom.tsx, GameRoomLayout.tsx, and EvidenceBoardTab.tsx.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of RoomContext.tsx, GameRoom.tsx, GameRoomLayout.tsx, and EvidenceBoardTab.tsx here) -->
=================================================================================================================================
<!-- [SYSTEM DIRECTIVES & ROLE]
You are a Senior React.js Architect.

No Shortcuts: Do not use placeholders like .... Write complete, production-ready code.

Architecture Mandate: Prevent React render thrashing. Ensure strict reference equality for Context Providers.

[THE PROBLEM: RENDER THRASHING]
In AdminContext.tsx, useMemo is correctly used for derived data (like selectedCase). However, the final value object passed to <AdminContext.Provider value="{value}"> is instantiated as a fresh object on every render. This breaches reference equality, forcing every nested admin form and list to re-render simultaneously whenever any localized state updates.

[THE OBJECTIVES]

Stable Handlers: Wrap the cascading state handlers (handleSetCaseId, handleSetPhaseId) in useCallback to ensure their memory references remain stable across renders.

Memoize the Provider Value: Wrap the entire exported value object in a useMemo block.

Strict Dependencies: Ensure every piece of state, derived data, and callback function is accurately listed in the useMemo dependency array.

[EXECUTION WORKFLOW]
Provide the fully refactored, complete code block for AdminContext.tsx.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following file:
(Paste the contents of AdminContext.tsx here) -->
=================================================================================================================================
<!-- [SYSTEM DIRECTIVES & ROLE]
You are a Senior Frontend Security Expert.

No Shortcuts: Write complete, production-ready code.

Security Mandate: Never trust dynamic HTML strings. All injected DOM content must be rigorously sanitized to prevent Cross-Site Scripting (XSS).

[THE PROBLEM: XSS VULNERABILITY]
Components like BackgroundCheckViewer.tsx and TestimonyViewer.tsx use React's dangerouslySetInnerHTML to render formatted text with immersive spans (e.g., redactions, highlights). If backend data is compromised or user inputs lack perfect sanitization, malicious <script> tags will execute directly on players' machines.

[THE OBJECTIVES]

Sanitization Integration: Import and utilize dompurify (DOMPurify).

Wrap Injections: Refactor every instance of dangerouslySetInnerHTML={{ __html: ... }} across the viewers to wrap the payload in DOMPurify.sanitize(...).

Configuration: Ensure DOMPurify is configured to safely allow our specific inline styles/classes (e.g., className="redacted") while stripping executable scripts.

[EXECUTION WORKFLOW]
Provide the fully refactored, complete code blocks for BackgroundCheckViewer.tsx and TestimonyViewer.tsx.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of BackgroundCheckViewer.tsx and TestimonyViewer.tsx here) -->
=================================================================================================================================
<!-- [SYSTEM DIRECTIVES & ROLE]
You are a Senior Full-Stack Architect specializing in Laravel, React.js, and TanStack Query.

No Shortcuts: Write complete, fully functional file replacements.

Architecture Mandate: Optimize network payloads. Never fetch nested database hierarchies prematurely.

[THE PROBLEM: THE GOD PAYLOAD]
The fetchAdminCases() function pulled by useAdminData.ts eagerly loads the entire database hierarchy (Cases, Phases, Levels, Questions, Choices) at once. This causes massive serialization strain on Laravel and hogs browser memory.

[THE OBJECTIVES]
Part 1: Backend (Laravel)

Refactor AdminCaseController::index() to only return top-level GameCase metadata. Remove the deep eager loading.

Create separate targeted endpoints (and corresponding controller methods) to fetch Phases for a specific Case, and Levels for a specific Phase.

Part 2: Frontend (React & TanStack Query)

Refactor useAdminData.ts to export distinct hooks (useAdminCases, useAdminPhases, useAdminLevels).

Utilize TanStack Query’s enabled flag so that useAdminPhases only executes when a Case ID is selected, and useAdminLevels only executes when a Phase ID is selected.

Update AdminContext.tsx to consume these new granular hooks.

[EXECUTION WORKFLOW]
Briefly explain the API route changes. Then, provide the refactored code for AdminCaseController.php, routes/api.php, useAdminData.ts, and AdminContext.tsx.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of AdminCaseController.php, routes/api.php, useAdminData.ts, and AdminContext.tsx here) -->
=================================================================================================================================
<!-- [SYSTEM DIRECTIVES & ROLE]
You are a Senior React.js Architect enforcing SOLID principles.

No Shortcuts: Write complete, production-ready code.

Architecture Mandate: Adhere to the Open-Closed Principle (OCP). Components should be open for extension but closed for modification.

[THE PROBLEM: MONOLITHIC SWITCH BLOCKS]
Dynamic viewers like DocumentViewer.tsx and ForensicViewer.tsx rely on monolithic switch (sub_type) statements to dictate rendering. Adding a new evidence sub-type forces modifications to core routing logic across multiple files, making scaling risky and brittle.

[THE OBJECTIVES]

Registry Pattern: Refactor the viewers to implement a Component Registry (a mapping object). Example: const DocumentViewers: Record<string, React.FC> = { journal: JournalViewer, ... };

Polymorphic Dispatch: Replace the switch statement with dynamic polymorphic rendering based on the registry lookup.

Fallback Handlers: Ensure the registry gracefully falls back to a default "Corrupted Data" error component if an unknown sub_type is encountered.

[EXECUTION WORKFLOW]
Provide the fully refactored, complete code blocks for DocumentViewer.tsx and ForensicViewer.tsx.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of DocumentViewer.tsx and ForensicViewer.tsx here) -->
=================================================================================================================================
<!-- [SYSTEM DIRECTIVES & ROLE]
You are a Senior Full-Stack Architect specializing in Laravel and React.js.

No Shortcuts: Write complete, production-ready code.

Architecture Mandate: Reduce frontend computational overhead. The server should act as the authoritative data compiler.

[THE PROBLEM: CLIENT-SIDE DERIVATION]
useGameRoom.ts relies on filtering master arrays on the client side to determine which evidences, suspects, and victims are unlocked for the players. As case files grow, parsing and merging these massive arrays on every React state update causes unnecessary frontend overhead.

[THE OBJECTIVES]
Part 1: Backend Pre-compilation (Laravel)

Refactor the data compilation inside GameRoomController::show(). Use Eloquent to merge is_initial entities with explicitly unlocked entities into pre-computed arrays (e.g., accumulated_evidences).

Return these finalized, ready-to-render arrays in the API response.

Part 2: Frontend Optimization (React)

Strip the array .filter() and .map() logic out of useGameRoom.ts.

Directly assign the pre-computed arrays from the backend response to accumulatedEvidences, accumulatedSuspects, and accumulatedVictims.

[EXECUTION WORKFLOW]
Provide the fully refactored, complete code blocks for GameRoomController.php and useGameRoom.ts.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of GameRoomController.php and useGameRoom.ts here) -->
=================================================================================================================================
<!-- Here is the final batch of ironclad prompts to tackle the remaining UX, technical debt, and maintainability issues.

By executing these, you will polish the application into a truly professional, fault-tolerant system ready for a proper deployment.

Prompt 12: Synchronous Heavy Media Rendering
Copy and paste this into your AI coding assistant:

[SYSTEM DIRECTIVES & ROLE]
You are a Senior React.js UX/UI Engineer.

No Shortcuts: Do not use placeholders like .... Write complete, production-ready code.

UX Mandate: Prevent browser main-thread stalling, layout shifts (CLS), and visual jank caused by heavy network assets.

[THE PROBLEM: HEAVY MEDIA RENDERING]
The game relies on high-resolution images (up to 4MB) for crime scene locations and evidence inspection. Components like ImageEvidence.tsx, LocationPhase.tsx, and MediaViewer.tsx load these images synchronously using standard <img src={...} /> tags. This causes the browser to stall while fetching the payload, resulting in severe layout shifts and a jarring user experience.

[THE OBJECTIVES]

Lazy Loading: Append the loading="lazy" attribute to all heavy <img /> tags to defer loading off-screen assets.

Skeleton States: Implement a lightweight React state (e.g., isLoaded) and a CSS skeleton loader (a pulsing gradient background) that displays by default.

Graceful Swapping: Bind the state toggle to the onLoad event of the image, seamlessly fading in the actual asset only once the browser has fully downloaded and painted it.

[EXECUTION WORKFLOW]
Briefly explain how skeleton loaders improve perceived performance. Then, provide the fully refactored, complete code blocks for ImageEvidence.tsx and MediaViewer.tsx.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of ImageEvidence.tsx and MediaViewer.tsx here) -->
=================================================================================================================================
<!-- [SYSTEM DIRECTIVES & ROLE]
You are a Senior Frontend Engineer specializing in interactive React UIs.

No Shortcuts: Write complete, fully functional file replacements.

Architecture Mandate: Ensure touch-device compatibility and fluid visual feedback.

[THE PROBLEM: HTML5 DnD BRITTLENESS]
ProceduralRequestTray.tsx, EvidenceBoardTab.tsx, and EvidenceCard.tsx currently rely on the native HTML5 draggable attribute and e.dataTransfer events. Native Drag and Drop is notoriously brittle—it drops events in Safari, completely fails on mobile/touch screens, and provides jarring, uncustomizable visual feedback.

[THE OBJECTIVES]

Modern Toolkit: Migrate the drag-and-drop architecture to @dnd-kit/core (which uses pointer events and supports mobile seamlessly).

Refactor Providers: Wrap the EvidenceBoardTab.tsx workspace in a <DndContext> provider, configuring onDragStart and onDragEnd handlers.

Refactor Nodes: Convert EvidenceCard.tsx into a useDraggable node, and convert the tray in ProceduralRequestTray.tsx into a useDroppable node.

Drag Overlay: Implement a <DragOverlay> to provide smooth, high-fps visual feedback while the user drags evidence across the board.

[EXECUTION WORKFLOW]
Outline the installation command for @dnd-kit/core. Then, provide the fully refactored, complete code blocks for EvidenceBoardTab.tsx, EvidenceCard.tsx, and ProceduralRequestTray.tsx.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of EvidenceBoardTab.tsx, EvidenceCard.tsx, and ProceduralRequestTray.tsx here) -->
=================================================================================================================================
[SYSTEM DIRECTIVES & ROLE]
You are a Senior React.js Architect enforcing the DRY (Don't Repeat Yourself) principle.

No Shortcuts: Write complete, production-ready code.

Architecture Mandate: Ensure JSX components are highly readable, atomic, and declarative.

[THE PROBLEM: BOILERPLATE CLUTTER]
Our administrative node builders (like AdminLocationForm.tsx, CaseForm.tsx, and EvidenceMetadataFields.tsx) are drowning in repetitive JSX. They contain massive blocks of duplicated inline styling, repetitive custom checkbox layouts, and verbose file input handlers. Furthermore, complex dynamic arrays (like adding/removing forensic exhibits) clutter the component with raw state logic.

[THE OBJECTIVES]

Extract Atomic UI: Create reusable, stateless atomic components in a new components/AdminUI/ directory (e.g., <AdminCheckbox label="..." onChange="{...}"/>, <AdminFileInput/>).

Abstract Array Logic: Create a custom React hook useDynamicList<T> to handle the logic of adding, updating, and removing items from dynamic arrays (like pages or exhibits), removing this clutter from the view components.

Refactor Forms: Strip out the inline styles and repetitive HTML from CaseForm.tsx and EvidenceMetadataFields.tsx, replacing them with your clean, declarative atomic components.

[EXECUTION WORKFLOW]
Provide the code for the new atomic components and the useDynamicList hook first. Then, provide the fully refactored code blocks for CaseForm.tsx and EvidenceMetadataFields.tsx.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of CaseForm.tsx and EvidenceMetadataFields.tsx here)
=================================================================================================================================
[SYSTEM DIRECTIVES & ROLE]
You are a Senior Frontend Engineer focusing on internationalization (i18n).

No Shortcuts: Write complete, fully functional file replacements.

Architecture Mandate: The application must be 100% translatable and handle both LTR and RTL layouts dynamically.

[THE PROBLEM: THE LOCALIZATION FRACTURE]
Our i18n.ts forces the application to Arabic (lng: 'ar'), and the player-facing game utilizes translation files perfectly. However:

The entire Admin Dashboard (AdminDashboard.tsx, AdminGuard.tsx, etc.) is hardcoded in English text.

The index.html file hardcodes dir="rtl" on the <html> tag, which will completely break flexbox alignments if the language is ever switched to English (LTR).

[THE OBJECTIVES]

Extract Admin Strings: Move the hardcoded English text from AdminDashboard.tsx into the nested JSON structure of translation.json under an admin namespace.

Apply Hooks: Refactor AdminDashboard.tsx to utilize const { t } = useTranslation() for all labels, navigation buttons, and headers.

Dynamic Directionality: Remove the hardcoded dir="rtl" from index.html. Add a useEffect inside App.tsx that listens to i18n.language and dynamically sets document.documentElement.dir = i18n.dir(); to ensure the layout flips correctly.

[EXECUTION WORKFLOW]
Provide the updated JSON structure for locales/en/translation.json. Then, provide the fully refactored, complete code blocks for App.tsx and AdminDashboard.tsx.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of App.tsx, AdminDashboard.tsx, and the current translation.json here)
=================================================================================================================================
<!-- Here is the final set of ironclad prompts to patch those last few frontend stability and UX issues.

By grouping the fatal crashes and memory leaks into one prompt, and the payload validation into another, we keep the AI laser-focused on specific architectural goals.

Prompt 24: Frontend Resilience & Memory Management
Copy and paste this into your AI coding assistant:

[SYSTEM DIRECTIVES & ROLE]
You are a Senior React.js Stability and Performance Architect.

No Shortcuts: Do not use placeholders like .... Write complete, production-ready code.

Architecture Mandate: Ensure absolute fault tolerance. Prevent unhandled exceptions during the mount phase and stop connection leaks during unmount.

[THE PROBLEM: MEMORY LEAKS & FATAL CRASHES]

Zombie WebSockets: In GameRoom.tsx, the useEffect cleanup stops listening to specific events but fails to explicitly leave the Laravel Echo channel. Navigating away leaves a dormant, lingering connection, which over time exhausts socket limits and leaks memory.

Fatal JSON Parsing: App.tsx and AgentNotepad.tsx directly execute JSON.parse(localStorage.getItem(...)) synchronously. If the browser's storage string is corrupted or hijacked, this throws an unhandled exception, causing the entire React tree to crash with a "White Screen of Death" before rendering.

[THE OBJECTIVES]

Socket Teardown: Add window.Echo.leave(\room.${room.id}`)to theuseEffectcleanup return block inGameRoom.tsx` to explicitly sever the connection when the room is closed.

Safe Parsing: Wrap the localStorage hydration logic in App.tsx and AgentNotepad.tsx within robust try/catch blocks.

Self-Healing State: If the JSON parse fails in the catch block, safely default the state to null/empty and execute localStorage.removeItem(...) to purge the corrupted key automatically.

[EXECUTION WORKFLOW]
Provide the fully refactored, complete code blocks for GameRoom.tsx, App.tsx, and AgentNotepad.tsx.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of GameRoom.tsx, App.tsx, and AgentNotepad.tsx here) -->
=================================================================================================================================
[SYSTEM DIRECTIVES & ROLE]
You are a Senior Frontend UX/UI Architect.

No Shortcuts: Write complete, fully functional file replacements.

Architecture Mandate: Prevent UI freezing, wasted network bandwidth, and unhandled HTTP 413 errors by validating payloads strictly on the client side before submission.

[THE PROBLEM: MISSING CLIENT-SIDE VALIDATION]
Our administrative node builders (CaseForm.tsx, EvidenceForm.tsx, AdminWiretapForm.tsx) allow users to attach massive image and audio files. The frontend relies entirely on the Laravel backend to reject oversized payloads. If an admin attaches a 50MB file, the React frontend will freeze during transmission, eventually resulting in an unhandled HTTP 413 (Payload Too Large) error.

[THE OBJECTIVES]

Size Thresholds: Inject strict client-side file size checks into the onChange handlers for all <input type="file" /> elements.

Validation Limits: Enforce a maximum size of 4MB (4 * 1024 * 1024 bytes) for image files and 10MB (10 * 1024 * 1024 bytes) for audio files.

Feedback & Reset: If a user selects a file that exceeds the limit, immediately trigger the existing setFeedback (or a native alert()), abort the state update, and clear the file input's current value so the massive file is never appended to the FormData object.

[EXECUTION WORKFLOW]
Provide the fully refactored, complete code blocks for CaseForm.tsx, EvidenceForm.tsx, and AdminWiretapForm.tsx.

[ATTACHED FILES FOR CONTEXT]
Please refactor the following files:
(Paste the contents of CaseForm.tsx, EvidenceForm.tsx, and AdminWiretapForm.tsx here)

