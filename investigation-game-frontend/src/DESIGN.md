# Central UI/UX & Architecture Directives: Neo-Noir Investigation Game

This document is the absolute source of truth for all frontend design, styling, and architectural decisions[cite: 2]. Do not rely on generic UI patterns, default Tailwind setups, or standard web components[cite: 2].

## 1. Aesthetic Identity & Environment
The interface is a premium, high-end consumer mystery platform merging a AAA story-driven game menu with a 1980s neo-noir detective aesthetic[cite: 2].
*   **The Vibe:** The overarching atmosphere channels a quiet, solitary night drive[cite: 2]. Use heavy, absorbing shadows, deep muted darks, and suspenseful, gritty tactile elements[cite: 2].
*   **Modern Sleek Integration:** Use elegant, soft rounded corners on modern digital cards and modal panels (`border-radius: 16px` to `24px`)[cite: 2]. Incorporate large, immersive, desaturated background imagery with smooth, heavy gradient overlays fading to deep black[cite: 2].
*   **Cinematic Presentation:** Use clean, spacious, modern layouts with strong visual hierarchy, contrasting with diegetic elements like physical case files or CRT terminals[cite: 2].
*   **System Failure:** When the player errs (e.g., strikes, rejected warrants), the UI must bleed red (`var(--accent-crimson)`)[cite: 2]. Flash high-contrast crimson warnings[cite: 2].

## 2. Centralized Theme & Design Tokens [CRITICAL]
The global `index.css` file is the sole source of truth for the application's theme, merging modern UI variables with 80s tactile elements[cite: 2].
*   **Zero Hardcoding:** You are strictly forbidden from hardcoding hex codes, RGB values, or font families inside component `.module.css` files[cite: 2].
*   **Variable Consumption:** All colors, typography, and standard spacing must be consumed via CSS variables established in `index.css`[cite: 2].
    *   *Base UI:* `var(--bg-dark)`, `var(--charcoal)`, `var(--slate)`[cite: 2]
    *   *Accents:* `var(--accent-cyan)`, `var(--accent-crimson)`, `var(--crt-green)`, `var(--crt-amber)`[cite: 2]
    *   *Physical Evidence:* `var(--manila)`, `var(--sepia)`, `var(--faded-ink)`[cite: 2]
*   **Purpose:** The `.module.css` files exist only to handle structural layouts (Grid/Flexbox), component-specific spacing, and animations[cite: 2]. 

## 3. Immersive Friction & Diegetic UI
The system must feel deliberate and heavy, while maintaining smooth modern micro-interactions[cite: 2].
*   **Polished Interactions:** Use smooth, easing CSS transitions (`cubic-bezier`) for modal openings, tab switching, and button hovers[cite: 2].
*   **Mechanical Feedback:** Introduce artificial, authentic delays for decryption sequences, database queries, and loading states to build tension[cite: 2].
*   **Tactile Media:** Wiretaps and audio evidence must evoke the mechanical clunk and hiss of a physical tape deck[cite: 2].
*   **Custom Forensic Evidence Viewer:** Physical clues should strip away the digital feel[cite: 2]. Use `--manila` backgrounds with subtle noise textures, and deep, harsh drop shadows (`shadow-2xl`) so evidence appears resting on a desk[cite: 2].
*   **Node-Based Branching Dialogue & Interactive Maps:** Dialogue trees should evoke a "police terminal" using `--bg-dark` and `--crt-green`/`--crt-amber` highlights[cite: 2]. Map pins for crime scenes should pulse using CSS animations[cite: 2].

## 4. Typography & Information Density
*   **Cinematic Editorial Style:** For main menus, case briefings, and long-form text, enforce wide, breathable margins, high line-heights, and modern, highly legible typography (e.g., *Inter* or *Roboto Mono*)[cite: 2].
*   **Visual Hierarchy:** Maintain strict separation between primary narrative text (bright, bold, readable) and secondary metadata (muted, subtle gray)[cite: 2].
*   **Thematic Fonts:** Use *Playfair Display* or *Courier Prime* for case titles and *Caveat* for handwritten annotations on evidence[cite: 2]. Consumed strictly via CSS variables[cite: 2].

## 5. Technical Guardrails & State Management
Do not hallucinate styling libraries or mutate the data architecture[cite: 2].
*   **TypeScript & Property Integrity [CRITICAL]:** You must strictly prevent the hallucination of new properties, interfaces, or data structures. Only use the paths and properties already existing inside the target `.tsx` file, or strictly refer to the types defined within the `D:\Laravel\investigation-game\investigation-game-frontend\src\types` folder.
*   **Strict CSS Modules:** Global CSS and inline styling are strictly forbidden for new or refactored components[cite: 2]. You must migrate styles to airtight CSS Modules (`[Component].module.css`)[cite: 2].
*   **Backend Assumptions:** The frontend consumes pristine JSON payloads built via Eloquent ORM and broadcast via Reverb WebSockets[cite: 2]. Do not attempt to re-map, mutate, or "fix" the data structure on the frontend[cite: 2]. Respect the established React Context (`RoomContext.tsx`) as the single source of truth[cite: 2].
*   **Component Integrity:** Maintain strict Separation of Concerns[cite: 2]. Keep logic in custom hooks, rendering in `.tsx`, and styling in `.module.css`[cite: 2]. Never delete `useEffect` WebSocket listeners[cite: 2].

## 6. Internationalization (i18n) & RTL [CRITICAL]
This application is bilingual and supports Right-To-Left (RTL) Arabic layouts[cite: 2].
*   **No Hardcoded Text:** You must never hardcode English strings into the `.tsx` files[cite: 2]. Always use the existing `const { t } = useTranslation();` hook[cite: 2].
*   **RTL Safe Styling:** Do not use hardcoded `margin-left` or `padding-right`[cite: 2]. Use logical CSS properties (`margin-inline-start`, `padding-inline-end`) so the UI flips flawlessly between English and Arabic[cite: 2].
*   **Translation Mapping Expansion:** If new keys are created to improve or expand the UI, they must be added to the Arabic translation file at `D:\Laravel\investigation-game\investigation-game-frontend\src\locales\ar\translation.json`[cite: 2]. You must preserve all old existing keys during this process[cite: 2].

## 7. AI Refactoring Protocol
When instructed to refactor a component:
1.  Read the target `.tsx` and its existing `.css` file[cite: 2].
2.  Preserve all existing imports, hooks, and translation keys[cite: 2]. Do not invent new TypeScript properties outside of the defined `src/types` directory.
3.  Rewrite the CSS into a `.module.css` file enforcing the aesthetic rules above, relying entirely on `index.css` variables for colors and fonts[cite: 2].
4.  Update the `.tsx` file to import the new CSS Module and apply the new class names[cite: 2].