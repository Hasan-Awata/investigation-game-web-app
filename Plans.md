# CSS Modules Class-Fusion Defect Plan

**Status:** ACTIVE — not started
**Repo:** `D:\Laravel\investigation-game`
**Frontend root:** `investigation-game-frontend\`
**Baseline commit:** `f15e53b` ("feat: Refactor media and testimony viewers with modular CSS")
**Working tree at plan time:** clean (all prior migration work is committed)
**Scope:** 34 class-fusion defects across 20 files + 1 related unhashed-literal defect

> The commit message on `f15e53b` is misleading. That commit is the **entire** CSS Modules
> migration (Admin, Campaign, EvidenceBoard, viewers). Every defect below was introduced by it.

---

## 1. Why this exists

The migration renamed `X.css` → `X.module.css` (CSS content mostly unchanged) and rewrote
`className="base mod"` → `` className={`${styles['base']} ${styles['mod']}`} ``.

Two mistakes were made during that rewrite.

### Defect A — Fused class tokens (34 sites)

The space between the base class and its modifier was dropped. CSS class lists are
space-separated; concatenation without a space produces **one** token, not two.

```
styles['base'] + styles['mod']   ->   "_base_hash1_mod_hash2"     (1 token)  BROKEN
styles['base'] + ' ' + styles['mod'] -> "_base_hash1 _mod_hash2"   (2 tokens) CORRECT
```

Any rule written as a compound (`.base.mod`) or descendant (`.mod .child`) selector requires
both tokens to be separate members of the class list, so those rules never match. Where the
base class itself was fused, **the base rule stops applying too**.

### Defect B — Unhashed literal into a hashed compound (1 site)

`LevelCard.tsx:53` interpolated a **raw status string** (`'gated'`, `'undiscovered'`) into a
class list whose CSS had just become a module. `.level-list-item.gated` now compiles to
`._level-list-item_h._gated_h`, so the literal `gated` can never match. Inserting a space
(Defect A) is **necessary but not sufficient** on this line — it also needs a status→module map.

**In-repo reference implementation (correct pattern):** `Campaign/ZoneCard.tsx:73-79`

```tsx
let stateClass = styles.undiscovered;
stateClass = isGated ? styles.gated : styles.actionable;
<li className={`${styles.levelItem} ${stateClass}`} />   // note the space
```

---

## 2. Why the symptom looked fullscreen-only

Reported symptom: the evidence modal is fine, but fullscreen no longer forces the A4 sheet
onto the screen and the page no longer stretches vertically.

That is consistent with the diagnosis, not a contradiction of it:

| Element | Standalone base rule | Modifier | Modal result | Fullscreen result |
|---|---|---|---|---|
| `.viewers-container-wrapper` | yes — applies | `fullscreen-mode` | n/a | **broken** (backdrop, `margin/padding:0`) |
| `.viewers-zoom-overlay` | **none exists** | `zoom-enabled` / `native-scroll` | redundant | **broken — loses all layout** |
| `.viewers-content-area` | yes — applies | `fullscreen-scaled` | n/a | **broken** (A4 shrink-to-fit) |

In the modal only `native-scroll` is lost, and it is effectively redundant there: the 800px
sheet grows past `min-height:1131px` and the modal scrolls on its own. So **the modal looks
correct by accident**. In fullscreen all three modifiers are required, and `.viewers-zoom-overlay`
has no base rule to fall back on, so it collapses entirely.

This contract is documented in `DocViewer/UniversalDocViewer.css:8-13`, which explicitly
depends on the container's native-scroll mode. That file is **protected — do not edit it**.

### Consequence to watch

Fixing `ViewersContainer.tsx:132` also activates `native-scroll` (`height:100%; overflow:auto`)
in the modal, because both branches share one template literal. That is the genuine
`f15e53b~1` behaviour, so it is a restoration — but the modal's scroll container becomes
explicit and it may shift slightly. Build tooling cannot detect this; see the manual
checklist in §7.

---

## 3. Severity ranking

Fix in this order. Phases 1–2 are user-visible breakage; 3–5 are state styling.

| # | File(s) | Sites | Impact if unfixed |
|---|---|---|---|
| 1 | `ViewersContainer.tsx` | 3 | **Critical (reported).** Fullscreen evidence viewer unusable |
| 2 | `LevelCard.tsx` | 1 | **Critical.** Base rule also dead — level cards lose flex, background, border, padding, `min-height:80px`, cursor |
| 3 | `CampaignTab.tsx` | 3 | Map return-card never dims/greys out when a level is active; preview blur/overlay gating dead |
| 4 | `LocationPhase.tsx`, `InterrogationPhase.tsx`, `WiretapPhase.tsx`, `TestimonyViewer.tsx`, `GameEndOverlay.tsx`, `AgentNotepad.tsx` | 6 | Game feedback colours/state indicators dead |
| 5 | `AdminDashboard.tsx`, `AdminUI/index.tsx`, 6 forms, `ChoiceEditorCard.tsx`, `AdminInterrogationForm.tsx`, `CharacterForm.tsx:94`, `CaseCard.tsx` | 21 | Admin UI state styling dead (tab highlight, submit button amber/crimson, checkbox cards, guilty flag, card filters) |

---

## 4. Execution phases

One commit per phase. Each phase ends with its gate. Do not batch phases into one commit —
Phase 1 is a hotfix and should be independently revertable.

### Phase 1 — Evidence viewer fullscreen (the reported bug)

File: `src\pages\GameRoom\tabs\EvidenceBoard\Viewers\ViewersContainer.tsx`

Insert one space in each template literal.

| Line | Current | After |
|---|---|---|
| 129 | `` `${viewersContainer['viewers-container-wrapper']}${isFullscreen ? viewersContainer['fullscreen-mode'] : ''}` `` | `` `${viewersContainer['viewers-container-wrapper']} ${isFullscreen ? viewersContainer['fullscreen-mode'] : ''}` `` |
| 132 | `` `${viewersContainer['viewers-zoom-overlay']}${isFullscreen ? viewersContainer['zoom-enabled'] : viewersContainer['native-scroll']}` `` | `` `${viewersContainer['viewers-zoom-overlay']} ${isFullscreen ? viewersContainer['zoom-enabled'] : viewersContainer['native-scroll']}` `` |
| 142 | `` `${viewersContainer['viewers-content-area']}${isFullscreen ? viewersContainer['fullscreen-scaled'] : ''}` `` | `` `${viewersContainer['viewers-content-area']} ${isFullscreen ? viewersContainer['fullscreen-scaled'] : ''}` `` |

Do **not** touch `ViewersContainer.module.css` — it is correct as written.

Gate:
```powershell
cd investigation-game-frontend
npx tsc -b          # expect exit 0
npm run build       # expect success
npm run lint        # expect baseline: 138 problems (134 errors, 4 warnings) — no new problems
```
Then confirm in `dist\assets\index-*.js` that the wrapper/content props are two separate tokens:
```
Select-String -Path dist\assets\*.js -SimpleMatch -Pattern '_viewers-container-wrapper'
```

### Phase 2 — LevelCard (Defect A + Defect B)

File: `src\pages\GameRoom\tabs\Campaign\LevelCard.tsx:53`

Current:
```tsx
className={`${levelCard['level-list-item']}${status} ${isSelected ? levelCard['selected'] : ''}`}
```

Replace with a resolved module class, mirroring `ZoneCard.tsx:73-79`. `status` is typed
`'undiscovered' | 'gated' | 'actionable' | 'completed'` (line 7).

```tsx
const statusClass =
  status === 'undiscovered' ? levelCard['undiscovered']
  : status === 'gated' ? levelCard['gated']
  : status === 'actionable' ? levelCard['actionable']
  : '';

// in JSX:
className={`${levelCard['level-list-item']} ${statusClass} ${isSelected ? levelCard['selected'] : ''}`}
```

Notes for this phase:
- `LevelCard.module.css` defines `.undiscovered` and `.gated` as **local** classes (hashed).
  `actionable` and `completed` are **not defined in this file** — `completed` should map to `''`.
  Verify what actually exists before writing the map:
  ```powershell
  Select-String -Path src\pages\GameRoom\tabs\Campaign\LevelCard.module.css -Pattern "undiscovered|gated|actionable|completed"
  ```
  If `actionable` is genuinely absent, map it to `''` rather than emitting a dead token.
- Do **not** add `:global()` here. Exposing these would reintroduce global leakage the
  migration removed.
- `.level-list-item:hover:not(.locked)` (line 17) references a `locked` state this component
  never sets. Pre-existing; leave it, note it in §8.

Gate: same as Phase 1, plus confirm the base rule is reachable:
```powershell
Select-String -Path dist\assets\*.css -Pattern '_level-list-item'
```

### Phase 3 — Campaign map return + preview gating

File: `src\pages\GameRoom\tabs\Campaign\CampaignTab.tsx` — add a space after the first token.

| Line | Base | Modifier |
|---|---|---|
| 226 | `campaignTab['return-map-card']` | `campaignTab['locked']` |
| 248 | `campaignTab['preview-bg-layer']` | `campaignTab['blurred']` |
| 255 | `campaignTab['preview-overlay']` | `campaignTab['hidden']` |

### Phase 4 — Game feedback states

One space each, same shape:

| File | Line | Base → Modifier |
|---|---|---|
| `Campaign\Levels\Interrogation\InterrogationPhase.tsx` | 223 | `vote-status-box` → `has-vote` / `no-vote` |
| `Campaign\Levels\Location\LocationPhase.tsx` | 368 | `loc-info-bubble` → `success` / `error` |
| `Campaign\Levels\Wiretap\WiretapPhase.tsx` | 127 | `wiretap-container` → `played` |
| `EvidenceBoard\Viewers\TestimonyViewer.tsx` | 79 | `transcript-line` → `transcript-q` / `transcript-a` |
| `components\GameEffects\GameEndOverlay.tsx` | 59 | `stat-value` → `error` / `success` |
| `components\AgentNotepad\AgentNotepad.tsx` | 80 | `save-indicator` → `synced` / `saving` |

`TestimonyViewer` is not just a compound: `.transcript-q` / `.transcript-a` are **standalone**
rules *and* `.transcript-q .speaker-tag` descendant rules. The fusion currently kills both the
per-line margins/borders and the blue/red speaker-tag colours.

`GameEndOverlay.tsx:51` already does it correctly (`${...['stat-value']} ${...['highlight']}`) —
use it as the in-file reference.

### Phase 5 — Admin surface

**5a. `src\pages\Admin\AdminDashboard.tsx`** — 9 sites, lines 89, 90, 91, 98, 99, 100, 107, 108, 109.
Identical shape; `admin-tab-btn` → `active`.

**5b. `src\pages\Admin\components\AdminUI\index.tsx`** — 3 sites:

| Line | Change |
|---|---|
| 54 | `` `${adminForms['admin-checkbox-card']}${className}` `` → space before `${className}` |
| 166 | `coordinate-picker-image-wrapper` → `mapping-active` |
| 172 | `locationPhase['loc-hover-zone']` → `selected` / `investigated` |

Line 54 is **actively broken, not latent**: `className` defaults to `''` so it looks harmless,
but 8 call sites pass a module class (`adminForms['status-live']`, `['status-draft']`,
`['amber']`) — `CaseForm.tsx:160`, `CharacterForm.tsx:105,106,129`, `EvidenceForm.tsx:198,199`,
`LevelForm.tsx:100,104`. Both the base card styling and the status colour are dead at all 8.

**5c. Forms — 6 sites, one shape:**
```
className={`btn-primary ${adminForms['admin-submit-btn']}${editingId ? adminForms['editing'] : adminForms['creating']}`}
```
Files: `CaseForm.tsx:221`, `CharacterForm.tsx:138`, `EvidenceForm.tsx:255`,
`InvestigationRequestForm.tsx:94`, `LevelForm.tsx:106`, `ZoneForm.tsx:147`.

`InvestigationRequestForm.tsx:94` has a nested variant — the inner template is already correct,
only the outer junction after `admin-submit-btn` needs the space:
```
`btn-primary ${adminForms['admin-submit-btn']}${editingId ? adminForms['editing'] : `${adminForms['cyan-accent']} ${adminForms['creating']}`}`
```

`btn-primary` / `btn-secondary` are **global** (defined in `src\index.css:101-146`) and must
stay as bare literals. Do not convert them to module lookups.

**5d. Remaining singles:**

| File | Line | Base → Modifier |
|---|---|---|
| `Admin\forms\CharacterForm.tsx` | 94 | `admin-list-id` → `admin-list-guilty` |
| `Admin\forms\QuestionForm\AdminInterrogationForm.tsx` | 74 | `dialogue-node-card` → `unsaved` |
| `Admin\forms\Shared\ChoiceEditorCard.tsx` | 129 | `target-btn` → `active` (after global `btn-secondary `) |
| `MainMenu\CaseCard\CaseCard.tsx` | 26 | `case-card` → `is-solved` (first junction only) |

`CaseCard.tsx:26` already spaces the `is-failed` and `is-locked` branches; only the first is fused.

### Phase 6 — Final verification

Run after every phase, and once more at the end:

```powershell
cd investigation-game-frontend
npx tsc -b
npm run build
npm run lint     # MUST still report exactly 138 problems (134 errors, 4 warnings)
```

Then run the fusion scan (§6) and confirm **zero** hits.

Commit:
```powershell
git add -A
git commit -m "fix(css): restore class-token separation across modular CSS regression"
```

---

## 5. Lint baseline

`npm run lint` exits nonzero **by design** on a clean tree. The baseline is:

```
138 problems (134 errors, 4 warnings)
```

Do **not** treat a nonzero exit as failure and do **not** try to fix the baseline. The gate is
"the count is unchanged". If it rises, a phase introduced a new problem — stop and inspect.

---

## 6. Regression scan (throwaway — do not commit)

This is a diagnostic, not a permanent tool. Run it, record the result in the commit or in this
file, then delete it. A previous instance lived at
`%LOCALAPPDATA%\Temp\opencode\scan-plaintext-classes.mjs` and was deleted after use.

Detects `]}${` — a `className` interpolation closed and immediately reopened with no space.

```js
// scan-fusion.mjs  — run with: node scan-fusion.mjs   (from investigation-game-frontend)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'src';
const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    statSync(p).isDirectory() ? walk(p) : p.endsWith('.tsx') && files.push(p);
  }
})(ROOT);

let hits = 0;
for (const f of files) {
  readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
    // ignore genuine multi-line template continuations
    const col = line.indexOf('className');
    if (col === -1) return;
    if (/className=\{`[^`]*\}\s*`/.test(line)) return;   // closes then reopens a template
    if (line.includes(']}${') && !line.includes('] }${')) {
      console.log(`${relative('.', f)}:${i + 1}: ${line.trim()}`);
      hits++;
    }
  });
}
console.log(`\nfusion sites: ${hits}`);
process.exit(hits ? 1 : 0);
```

Exit 0 and `fusion sites: 0` is the pass condition.

**Bundle-level proof** (stronger than the scan — catches classes that are referenced but never
reached). Vite emits `_name_hash_line`, so match with `[a-z0-9_]+`:

```powershell
$t = Get-Content (Get-ChildItem dist\assets -Filter *.css | Select-Object -First 1).FullName -Raw
[regex]::Match($t, '\._viewers-container-wrapper_[a-z0-9_]+\._fullscreen-mode_[a-z0-9_]+').Success  # expect True
```

Note: `[a-z0-9]+` without the underscore produces **false negatives** here, because the hash is
followed by `_<lineNumber>`. Always use `[a-z0-9_]+`.

---

## 7. Manual verification checklist

Tooling cannot catch layout regressions. After Phase 1, confirm by hand:

- [ ] Open a document evidence → modal renders, sheet is 800px wide, grows past 1131px
- [ ] Long document scrolls inside the modal (this is the `native-scroll` restoration — expect the
      scroll container to become explicit; if the modal now clips or double-scrolls, stop and
      report rather than adding ad-hoc CSS)
- [ ] Toggle fullscreen → sheet is scaled to fit, centred, dark backdrop, no page scrollbars
- [ ] Zoom with the wheel and drag to pan; clamping still holds at the edges
- [ ] Repeat for a forensic evidence, a media/image evidence, a testimony, and a terminal evidence
      (all four route through `ViewersContainer`)

After Phase 2:
- [ ] Campaign level list items render as cards (bordered, padded, `min-height:80px`, pointer cursor)
- [ ] Selected level shows the cyan highlight + `border-inline-start`
- [ ] Gated level greys out; undiscovered level is muted

---

## 8. Deliberately out of scope

Do **not** "fix" these as part of this plan. They were observed during the audit and are recorded
here so a later session does not rediscover them and assume they are new:

1. `CampaignTab.module.css` contains a **duplicated** `.return-map-card.locked` block (identical
   declarations, twice). Cosmetic dead weight from the migration. Safe to delete one copy.
2. `MainMenu/CaseCard/CaseCard.module.css` — `.case-card.is-solved` and `.case-card.is-failed`
   compile to **identical** declarations (`filter:grayscale(80%)brightness(.6)`), so solved and
   failed cards are visually indistinguishable. Likely a copy-paste slip in the original CSS.
   Needs a product decision on what should differ — do not guess.
3. `LevelCard.module.css:17,23` reference `:not(.locked)`, but `LevelCard`'s `status` values are
   `undiscovered | gated | actionable | completed` — `locked` is never applied. Pre-existing
   dead selector, predates the migration.
4. `CharacterCard.module.css` has a duplicate `fadeIn` keyframe collision. Pre-existing,
   unrelated to this plan.

### Protected files — never edit

- `src\index.css` (defines global `btn-primary`, `btn-secondary`)
- `src\pages\GameRoom\tabs\SharedOverlay.css`
- `src\components\blocks\blocks-shared.css`
- `DocViewer\UniversalDocViewer.css` — documents the A4 / native-scroll contract
- `DocViewer\`, `TerminalViewer\`, and the existing `DocBuilder.module.css`

Do not add `:global()` to work around a fusion. The space is the fix; `:global()` would
reintroduce the global leakage the migration removed.

---

## 9. Progress log

Append one line per completed phase.

| Phase | Commit | Date | Result |
|---|---|---|---|
| — | — | — | Plan written; no code changed |
