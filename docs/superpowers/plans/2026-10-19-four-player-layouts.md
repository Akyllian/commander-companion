# Four-Player Manual Layouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a four-player pod explicitly choose Grid, Face-to-face or Table seating without screen rotation changing that choice.

**Architecture:** Store the selected topology in the existing preferences object, never in game/history state. Separate responsive density detection from topology, expose the preference through an accessible side-sheet selector, and place each stable player-panel instance in a presentation-only seat wrapper so rotation/reflow never remounts or mutates the player.

**Tech Stack:** React 19, TypeScript 7, CSS Grid, Web Animations API/CSS, Vitest, Testing Library, localStorage

**Spec:** `docs/superpowers/specs/2026-10-19-four-player-layout-selector-design.md`

## Global Constraints

- The control exists only for exactly four players; hiding it never erases the saved preference.
- `grid` is the default and invalid-value fallback.
- Viewport orientation changes density/reflow only, never topology.
- DOM/tab order remains player 1→4 in every layout.
- Menus, sheets, dialogs, tooltips and focus rings remain upright to the viewport.
- All targets remain at least 44×44 px; reflow/scroll is preferred to clipping.
- Layout change is a 140 ms crossfade/2px settle, never an animated rotation; reduced motion is immediate.
- Do not add dependencies or put layout state in game persistence/history.

## Review Focus

- Old/partial/corrupt preferences fall back field-by-field without losing `keepScreenOn`.
- Rotating while Face-to-face/Table is selected retains the exact selection and score state.
- Player removal/new game hides or restores the selector without erasing the saved layout.
- Details and rules sheets opened from rotated panels are upright and return focus to the rotated opener.
- 90° seats reserve correct geometry and never overflow the page horizontally at 200% zoom.

---

### Task 1: Persist the layout preference

**Files:**
- Modify: `src/settings/preferences.ts`
- Modify: `src/settings/preferences.test.ts`

**Interfaces:**
- Produces: `FourPlayerLayout = 'grid' | 'facing' | 'table'`
- Produces: `Preferences.fourPlayerLayout`
- Produces: `DEFAULT_PREFERENCES.fourPlayerLayout = 'grid'`

- [ ] **Step 1: Write failing preference tests**

  Assert default, round-trip of all three values, invalid layout fallback with a valid Wake Lock value preserved, partial old preference migration and failed writes.

- [ ] **Step 2: Run the focused test and confirm failure**

  Run: `npm test -- src/settings/preferences.test.ts`  
  Expected: FAIL because the layout field/type is absent.

- [ ] **Step 3: Implement field-by-field validation**

  Export the union/type guard as needed by the selector. Preserve the existing localStorage key and backwards compatibility.

- [ ] **Step 4: Run the focused test**

  Run: `npm test -- src/settings/preferences.test.ts`  
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/settings/preferences.ts src/settings/preferences.test.ts
  git commit -m "feat: persist four-player layout choice"
  ```

### Task 2: Decouple compact density from orientation

**Files:**
- Create: `src/platform/useCompactDensity.ts`
- Create: `src/platform/useCompactDensity.test.tsx`
- Remove after callers migrate: `src/platform/useCompactLandscape.ts`
- Modify: `src/test/matchMedia.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Produces: `COMPACT_DENSITY_QUERY = '(max-height: 30rem)'`
- Produces: `useCompactDensity(): boolean`

- [ ] **Step 1: Write failing media-query tests**

  Assert compact density follows usable height and change events without requiring landscape orientation; separately assert a saved topology does not change when matchMedia changes.

- [ ] **Step 2: Run focused tests and confirm failure**

  Run: `npm test -- src/platform/useCompactDensity.test.tsx src/App.test.tsx`  
  Expected: FAIL because only `useCompactLandscape` exists.

- [ ] **Step 3: Implement and migrate callers**

  Rename component props/comments/data attributes from `compact landscape` to `compact density` where they describe presentation. Keep the 30rem threshold unless visual verification proves a regression; do not read `screen.orientation` to choose layout.

- [ ] **Step 4: Run focused tests**

  Run: `npm test -- src/platform/useCompactDensity.test.tsx src/App.test.tsx`  
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/platform src/test/matchMedia.ts src/App.tsx src/App.test.tsx
  git commit -m "refactor: separate compact density from orientation"
  ```

### Task 3: Build the layout selector

**Files:**
- Create: `src/components/LayoutSelector.tsx`
- Create: `src/components/LayoutSelector.test.tsx`
- Modify: `src/components/TableControls.tsx`
- Create: `src/components/TableControls.test.tsx`
- Modify: `src/components/icons.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `FourPlayerLayout`, current player count and `onChange(nextPreferences)`
- Produces: top-level `Layout` trigger and `ModalSideSheet` with three radio-like options

- [ ] **Step 1: Write failing selector/integration tests**

  Assert trigger order after Rules/before Preferences; hidden at two/three players; exact title/names/descriptions; `radiogroup`/`aria-checked`; selected label; immediate save/close; Escape; focus restoration; and reappearance with the preserved choice after returning to four players.

- [ ] **Step 2: Run focused tests and confirm failure**

  Run: `npm test -- src/components/LayoutSelector.test.tsx src/components/TableControls.test.tsx src/App.test.tsx`  
  Expected: FAIL because the selector is absent.

- [ ] **Step 3: Implement selector and header access**

  Reuse `ModalSideSheet`; use authored schematic SVG/CSS previews, not screenshots. In compact density retain the full accessible name when visible text is hidden. A choice calls the existing preference update path, closes and returns focus.

- [ ] **Step 4: Run focused tests**

  Run: `npm test -- src/components/LayoutSelector.test.tsx src/components/TableControls.test.tsx src/App.test.tsx`  
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/LayoutSelector.tsx src/components/LayoutSelector.test.tsx src/components/TableControls.tsx src/components/TableControls.test.tsx src/components/icons.tsx src/App.tsx src/App.test.tsx
  git commit -m "feat: add manual table layout selector"
  ```

### Task 4: Seat and orient stable player panels

**Files:**
- Create: `src/components/PlayerSeat.tsx`
- Create: `src/components/PlayerSeat.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/app.css`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `FourPlayerLayout`, zero-based player index and panel/undo content
- Produces: `.player-seat[data-seat][data-orientation]` wrappers without remounting `PlayerPanel`

- [ ] **Step 1: Write failing seat tests**

  Assert exact orientation maps: grid `[0,0,0,0]`, facing `[180,180,0,0]`, table `[0,90,180,-90]` attached to the named players/approved edges; unchanged DOM order; score persistence; and removed-player Undo occupying the removed seat.

- [ ] **Step 2: Run focused tests and confirm failure**

  Run: `npm test -- src/components/PlayerSeat.test.tsx src/App.test.tsx`  
  Expected: FAIL because seat wrappers/data are absent.

- [ ] **Step 3: Implement stable seat wrappers and CSS topology**

  Grid/facing use 2×2 cells. Table uses the approved 3×3 edge map with an empty center. Reserve swapped dimensions for ±90° content through the wrapper; never rely on a transform that visually overflows an unrotated box. Keep portals outside the rotated subtree.

- [ ] **Step 4: Implement non-remounting layout motion**

  Animate the existing grid element through Web Animations API or an equivalent class pulse: 140 ms from opacity/2px settle to rest. Do not key/remount the grid or panels, and skip animation when reduced motion matches.

- [ ] **Step 5: Run focused tests**

  Run: `npm test -- src/components/PlayerSeat.test.tsx src/App.test.tsx`  
  Expected: PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/PlayerSeat.tsx src/components/PlayerSeat.test.tsx src/App.tsx src/styles/app.css src/App.test.tsx
  git commit -m "feat: orient four-player table seats"
  ```

### Task 5: Finish art direction, accessibility and records

**Files:**
- Modify: `src/styles/app.css`
- Modify: `src/styles/tokens.css`
- Modify: `docs/DESIGN_SYSTEM.md`
- Modify: `docs/PLAYTEST_CHECKLIST.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/ROADMAP.md`

**Interfaces:**
- Consumes: selector/seat classes from Tasks 3–4
- Produces: canonical previews, viewport QA and implemented status for D-034

- [ ] **Step 1: Apply canonical selector styling**

  Use a dark continuous sheet, gold hairlines, teal/gold selected state, Cormorant display title and restrained player-accent markers. Avoid neon green, generic settings cards and motion through 90°/180°.

- [ ] **Step 2: Verify accessible geometry and overlays**

  Test 320×568, 390×844, 844×390, 844×330, 768px tablet, 1024px tablet, 1440px and 200% zoom in all three layouts. Open player Details, Rules, Match and Preferences from every orientation; confirm they remain upright, trap focus and return it to the correct opener.

- [ ] **Step 3: Update design system and playtest records**

  Document data attributes, exact geometry, selection treatment, motion/reduced motion and the four-person physical-table script. Mark D-034 implemented only after automated and visual verification; record real-device verification separately.

- [ ] **Step 4: Run final verification**

  Run: `npm run verify`  
  Expected: typecheck, lint, coverage and build all PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/styles/app.css src/styles/tokens.css docs/DESIGN_SYSTEM.md docs/PLAYTEST_CHECKLIST.md docs/DECISIONS.md docs/ROADMAP.md
  git commit -m "docs: finish manual layout design handoff"
  ```
