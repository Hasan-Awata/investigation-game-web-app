# Execution Plan: CSS Architecture Unification

The objective is to migrate the entire frontend codebase to a strict CSS Modules architecture. The agent must systematically audit the `src` directory and convert all standard component-level stylesheets to modular stylesheets, eliminating global CSS scope bleed.

## I. Architectural Scope & Exclusion Zones
The agent must convert every component-specific `.css` file across the entire project (including all nested `pages`, `components`, `tabs`, and `EvidenceVariants` directories) to CSS Modules[cite: 1]. However, the agent must strictly preserve the following global systems to prevent severing dynamic HTML rendering and global theming:

*   **Global Variables & Resets:** Do not modify `src/index.css`[cite: 1, 2].
*   **Dynamic Injection Modals:** Do not modify `src/pages/GameRoom/tabs/SharedOverlay.css`, as it handles global persona feedback modals and toast notifications injected dynamically outside the standard React flow[cite: 1, 2].
*   **Document & Terminal Engines:** Do not modify any `.css` files inside the `DocViewer` and `TerminalViewer` directories[cite: 1, 2]. The `BlockRenderer` and `TerminalBlockRenderer` systems parse JSON/HTML envelopes and apply static CSS classes (e.g., `.db-prose`, `.tb-prompt-line`)[cite: 1, 2]. Modularizing `blocks.css`, `themes.css`, `terminal.css`, or `UniversalDocViewer.css` will break the paper and terminal evidence rendering engines[cite: 1, 2].

## II. Conversion Protocol
For every eligible file discovered during the codebase audit, execute the following transformation sequence:

1.  **File Renaming:** Rename the target `[Component].css` file to `[Component].module.css`[cite: 1].
2.  **Import Updates:** Replace the standard import (e.g., `import './Auth.css'`) with the modular import (`import styles from './Auth.module.css'`)[cite: 1].
3.  **Hyphenated Class Mapping:** Retain existing hyphenated class names in the CSS files[cite: 2]. Update the `.tsx` files to use bracket notation to prevent rewriting errors (e.g., replace `className="case-card-hero"` with `className={styles['case-card-hero']}`).
4.  **Global Utility Preservation:** Identify and preserve classes originating from `index.css` or `SharedOverlay.css` (e.g., `btn-primary`, `glass-panel`, `terminal-text`)[cite: 1, 2]. Map these as static strings alongside the modularized classes using template literals:
    *   *Format:* `<div className={`glass-panel ${styles['auth-panel']}`}>`

## III. Agent Guardrails
*   **Tag Selectors:** Leave tag selectors (e.g., `h1`, `p`) inside the CSS files unmodified[cite: 2]. CSS Modules will automatically scope them to the local component wrapper.
*   **State Classes:** Ensure dynamic state classes (e.g., `.is-solved`, `.is-failed`, `.is-locked`) are properly mapped via template literals when evaluating component props or state[cite: 1, 2].
*   **Animation Keyframes:** Do not duplicate `@keyframes` defined in global files (such as `fadeIn` or `pulse` in `index.css`) into the modular files[cite: 2]. Ensure modularized elements referencing these animations continue to use the global names[cite: 2].

---

# Phase 5: Storage Utility Coverage Completion — ✅ COMPLETED (Reference Only)

> **This section is NOT a to-do list.** Phase 5 has already shipped and is verified. Everything below is written as instructions in the imperative because that is the format used by the rest of this document — read it as *"this is what was done, and here is why it was done that way"* rather than *"do this."* Do not re-execute it.
>
> **Outcome:** 5 files migrated (`auth.ts`, `useGameRoom.ts`, `MainMenu.tsx`, `App.tsx`, `InterrogationPhase.tsx`) + 2 helpers added to `utils/storage.ts`. Verified: `tsc -b --force` clean, build green, 0 lint errors on all touched files, 27/27 runtime assertions passing. `src/` now contains **zero** direct `localStorage` / `sessionStorage` access outside `utils/storage.ts`.
>
> **Why this section is retained at all:** the *reasoning* below is load-bearing. It documents two footguns that look like harmless DRY opportunities but cause a silent authentication outage. This is context for understanding the codebase, not a work queue.

Phase 5 was a follow-up to the Frontend Boilerplate Elimination work (Phases 1–4, all shipped). The CSS plan in the section above is unaffected and remains independently executable.

## I. Why the JSON helpers are NOT universally applicable

The Phase 1 helpers serialise values with `JSON.parse` / `JSON.stringify`. That is correct for structured payloads but actively dangerous for **opaque scalars** that are already stored as bare strings, because converting them changes the on-disk format:

*   **`auth_token` must not be migrated to the JSON helpers.** It is stored unquoted and read raw by `getToken()`, which is interpolated into `Bearer ${getToken()}` across `services/api.ts` (12 sites), `services/adminApi.ts`, `main.tsx`, `hooks/useAuth.ts` and `App.tsx`. Writing it via `setSafeStorage` would persist `"abc123"` *with literal quote characters*, corrupting every outgoing `Authorization` header. Reading a legacy unquoted token via `getSafeStorage` makes `JSON.parse('abc123')` throw, which trips the self-heal purge and **silently signs out every active user**. Same failure class as the Phase 4 AgentNotepad defect, but app-wide instead of one field.
*   **`active_room_id_for_<invite>` is an opaque identifier**, not structured data. It is written once and read once inside the same module, and the reader is `parseInt(roomId, 10)`. Preserving the bare-string format keeps that call site and its typing untouched.

## II. New Utility Additions (`src/utils/storage.ts`)

Add two **raw, non-JSON** helpers. They must never call `JSON.stringify` / `JSON.parse`, must never evict a key, and must preserve the existing on-disk format byte-for-byte:

1.  **`getSafeStringStorage(type: StorageType, key: string, fallback: string): string`** — returns the stored string, or `fallback` when the key is absent or Web Storage is unavailable. Never throws. Unlike `getSafeStorage` it treats any string as valid, so it has no corruption path and performs no purge.
2.  **`setSafeStringStorage(type: StorageType, key: string, value: string): void`** — writes the value verbatim and never throws, matching the quota / private-mode degradation of `setSafeStorage`.

Both must reuse the existing `resolveStore` guard.

## III. Migration Targets

1.  **`src/services/auth.ts`** — define a local `AUTH_TOKEN_KEY = 'auth_token'`. Replace the two `localStorage.setItem('auth_token', data.token)` calls (login, register) with `setSafeStringStorage('local', AUTH_TOKEN_KEY, data.token)`; `logout()` with `removeSafeStorage('local', AUTH_TOKEN_KEY)`; and `getToken()` with `getSafeStringStorage('local', AUTH_TOKEN_KEY, '')`. **Verify the returned token contains no surrounding quotes.** Note that `getToken()` gains a non-null return type, so confirm every `Bearer` interpolation still compiles.

2.  **`src/hooks/useGameRoom.ts`** — replace `sessionStorage.getItem(storageKey)` with `getSafeStringStorage('session', storageKey, '')` and `sessionStorage.setItem(...)` with `setSafeStringStorage('session', ...)`. Keep the `.toString()` conversion and the `parseInt(roomId, 10)` call unchanged.

3.  **`src/pages/MainMenu/MainMenu.tsx`** — replace the `useEffect` hydration block with a **lazy `useState` initialiser**: `useState<User | null>(() => getLocalUser())`, and delete the effect along with the now-unused `useEffect` import. Do **not** write `setUser(getLocalUser())` inside the effect — an unconditional synchronous `setState` in an effect body trips `react-hooks/set-state-in-effect` (the old code only avoided the rule because its `setState` sat behind an `if`). The lazy initialiser is also strictly better: it removes a cascading render. Separately, this fixes a real pre-existing bug — the previous code called `JSON.parse(localStorage.getItem('auth_user'))` with **no `try/catch`**, so a corrupted payload threw a `SyntaxError` straight into render. Replace the `localStorage.setItem('auth_user', JSON.stringify(...))` inside the `fetchCases` query with `setSafeStorage('local', AUTH_USER_KEY, result.value.user)`. Import both `getLocalUser` and `AUTH_USER_KEY` from `@/utils/userState`.

4.  **`src/App.tsx`** — replace the hand-rolled `try { localStorage.removeItem('auth_user') } catch` block in `handleForceLogout` with `removeSafeStorage('local', AUTH_USER_KEY)`. The manual catch exists purely for the browser-restriction case the helper already handles.

5.  **`src/pages/GameRoom/tabs/Campaign/Levels/Interrogation/InterrogationPhase.tsx`** — the four `cacheKey` / `room_<id>_suspect_<qid>` / `room_<id>_investigator_<qid>` accesses. Replace the two `useState` initialiser truthiness checks with `getSafeStorage<boolean>('session', key, false)` and the `sessionStorage.setItem(cacheKey, 'true')` with `setSafeStorage('session', cacheKey, true)`. Legacy `'true'` parses to `true`, so this is lossless; the read becomes properly typed instead of a string-truthiness test.

## IV. Guardrails

*   **Do not** change the on-disk format of `auth_token` or `active_room_id_for_*`. Format drift here is an authentication outage, not a cosmetic regression.
*   Do not "simplify" `auth.ts` by routing it through the JSON helpers to reduce the helper count.
*   Preserve the `Result`-based error contract in `login` / `register`; only the persistence line changes.
*   Confirm `getSafeStringStorage` never purges — a token that merely looks like JSON must still be returned verbatim.

## V. Related Completed Work (Phase 4) — Reference Only

Phase 4 of the boilerplate elimination already shipped and is likewise **not** pending. Files: `GameRoom.tsx`, `GameRoomLayout.tsx`, `AgentNotepad.tsx`, `CampaignTab.tsx`, `LocationPhase.tsx`. Verified with 20/20 runtime assertions.

Three things a newcomer should know from it, because each looks like a defect and none is:

*   **`AgentNotepad.tsx` cross-tab sync re-reads through `getSafeStorage`.** The `storage` event's `e.newValue` is a *JSON-encoded* string, so assigning it to state directly would render the note wrapped in literal quotes. This is correct as written — do not "simplify" it back to `setNotes(e.newValue)`.
*   **Notes written before the JSON migration were purged on first load.** `getSafeStorage` treats a bare string as corruption and evicts it. This was investigated, raised explicitly, and **consciously accepted** as acceptable data loss — it is not an outstanding bug. Everything written after the migration is safe.
*   A known, unrelated, pre-existing lint warning remains at `InterrogationPhase.tsx` (`room.votes` is a redundant `useMemo` dependency). It was traced and confirmed harmless: `getQuestionConsensus` is an inline function in `CampaignTab.tsx` that reads `room.votes`, so it changes identity every render and the memo recomputes anyway. No stale-cache risk.