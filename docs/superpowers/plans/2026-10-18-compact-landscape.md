# Compact Landscape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved Phase 1.6 compact-landscape experience so the four-player table and all twenty life controls fit at 844×390 and 844×330 without page scrolling, while preserving accessible reflow at 200% zoom.

**Architecture:** Keep the reducer, history, persistence schema, and scoring semantics unchanged. Detect the compact-landscape media query in a small platform hook, pass that mode explicitly from `App`, and let the header, notices, and player panels choose a compact presentation. Extract reusable detail content from `PlayerPanel` so the standard layout can keep it inline while compact mode presents it in a focus-managed side sheet.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, CSS, native `dialog`, native Popover API with an explicit fallback.

**Spec:** [Compact Landscape Design](../specs/2026-10-18-compact-landscape-design.md)

## Global Constraints

- Do not change `GameState`, `GameAction`, storage versions, reducer behavior, history grouping, or score semantics.
- Activate compact mode only for `(orientation: landscape) and (max-height: 30rem)`; do not infer it from width alone.
- At normal zoom, the 844×390 and 844×330 four-player layouts must show all panels and all life controls without document scrolling.
- At 200% zoom or a physically narrow viewport, accessibility wins: controls remain at least 44×44 CSS px, the grid may reflow and scroll vertically, and horizontal document scrolling is forbidden.
- Preserve the standard portrait/desktop interface outside compact mode.
- Popovers follow the project's existing feature-detected fallback pattern. Side sheets introduce one shared native-`dialog`/fallback primitive without changing `ConfirmDialog`.
- Run focused tests after each red/green step and `npm run verify` before declaring the plan complete.

## Review Focus

- Media-query changes after mount update the layout without reload; Task 1 owns the automated test.
- The `Partita` menu remains usable when the Popover API is unavailable and restores focus when closed; Task 2 owns the automated tests.
- Long player names, negative/three-digit life totals, and four equal panels do not create horizontal overflow; Task 5 owns viewport verification.
- Simultaneous update and persistence notices share one compact `Stato app` surface and do not consume grid height; Task 4 owns the automated test.
- Removing a player from an open details sheet closes the sheet, focuses the Undo bar, and leaves that bar in the removed cell; Task 3 owns the integration test.

---

## File Map

### Create

- `src/platform/useCompactLandscape.ts` — the single media-query constant and reactive hook.
- `src/platform/useCompactLandscape.test.ts` — initial value, event subscription, and cleanup tests.
- `src/components/MatchMenu.tsx` — compact `Partita` popover/fallback and match actions.
- `src/components/MatchMenu.test.tsx` — menu action, fallback, keyboard, and preference tests.
- `src/components/DeltaBadge.tsx` — shared panel-delta type, target comparison, and badge rendering.
- `src/components/PlayerDetailsContent.tsx` — defeat, Commander, other counters, deck configuration, and optional remove action.
- `src/components/ModalSideSheet.tsx` — reusable native-dialog/fallback focus and dismissal primitive.
- `src/components/PlayerDetailsDialog.tsx` — player-labelled compact wrapper around the shared side sheet.
- `src/components/PlayerDetailsDialog.test.tsx` — open/close, focus, and removal-path tests.

### Modify

- `src/App.tsx` — own compact mode, place notices correctly, and pass presentation mode to children.
- `src/App.test.tsx` — integration coverage for header, player details, removal, Undo, and mode changes.
- `src/components/TableControls.tsx` — switch between standard controls and compact header actions.
- `src/components/PreferencesMenu.tsx` — expose the Wake Lock option as reusable content without duplicating state logic.
- `src/components/AppNotices.tsx` — add compact trigger and top-layer notice panel.
- `src/components/PlayerPanel.tsx` — render compact score rail/details trigger or the existing standard structure from shared content.
- `src/styles/app.css` — compact header, grid, panel, side-sheet, popover, and zoom-safe reflow rules.
- `docs/DECISIONS.md` — record the compact-landscape presentation boundary.
- `docs/ROADMAP.md` — mark Phase 1.6 complete only after verification.
- `docs/PLAYTEST_CHECKLIST.md` — add the approved viewport and interaction checks.

## Public Interfaces

Implement these contracts unless an existing project type requires only a naming adjustment:

```ts
export const COMPACT_LANDSCAPE_QUERY =
  '(orientation: landscape) and (max-height: 30rem)'

export function useCompactLandscape(): boolean
```

```ts
export interface PanelDelta {
  target: GroupTarget
  delta: number
  at: number
}

export function targetsMatch(left: GroupTarget, right: GroupTarget): boolean
```

```ts
interface TableControlsProps {
  currentPlayerCount: number
  canUndo: boolean
  canRedo: boolean
  compactLandscape: boolean
  preferences: Preferences
  onPreferencesChange: (next: Preferences) => void
  onUndo: () => void
  onRedo: () => void
  onReset: () => void
  onNewGame: (playerCount: number) => void
}
```

```ts
interface MatchMenuProps {
  currentPlayerCount: number
  preferences: Preferences
  onPreferencesChange: (next: Preferences) => void
  onNewGame: (playerCount: number) => void
  onReset: () => void
  supportsPopover?: boolean
}
```

```ts
interface PlayerDetailsDialogProps {
  open: boolean
  playerName: string
  onClose: () => void
  children: ReactNode
}
```

```ts
interface ModalSideSheetProps {
  open: boolean
  title: string
  className?: string
  initialFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
  children: ReactNode
}
```

`TableControls` replaces its generic `extra` slot with the typed preferences contract so standard and compact presentations cannot drift.

---

### Task 1: Add reactive compact-landscape detection

**Files:**

- Create: `src/platform/useCompactLandscape.ts`
- Create: `src/platform/useCompactLandscape.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Write the failing hook tests**

  Stub `window.matchMedia` with a controllable `MediaQueryList`. Assert that the hook requests exactly `COMPACT_LANDSCAPE_QUERY`, returns the initial `matches` value, rerenders on `change`, and removes its listener on unmount.

- [ ] **Run the focused test and confirm the expected failure**

  Run: `npm test -- src/platform/useCompactLandscape.test.ts`

  Expected: FAIL because the module and hook do not exist.

- [ ] **Implement the smallest hook**

  Use a lazy initial value, `addEventListener('change', ...)`, and cleanup. Treat missing `matchMedia` as `false` so Vitest and older WebViews remain safe.

- [ ] **Run the hook test and confirm it passes**

  Run: `npm test -- src/platform/useCompactLandscape.test.ts`

  Expected: PASS.

- [ ] **Write the failing App integration assertion**

  In `src/App.test.tsx`, assert that an `App` rendered with a matching media query exposes `data-compact-landscape="true"` on the application shell, then changes to `false` after the media event.

- [ ] **Wire the hook into `App`**

  Call the hook once in `App`, add the data attribute to the root shell, and pass the boolean to `TableControls`, `AppNotices`, and each `PlayerPanel`. Do not change visual structure yet.

- [ ] **Run the focused integration tests**

  Run: `npm test -- src/App.test.tsx`

  Expected: PASS with all existing App behavior unchanged.

- [ ] **Commit Task 1**

  ```bash
  git add src/platform/useCompactLandscape.ts src/platform/useCompactLandscape.test.ts src/App.tsx src/App.test.tsx
  git commit -m "feat: detect compact landscape layout"
  ```

---

### Task 2: Replace compact match controls with the `Partita` menu

**Files:**

- Create: `src/components/MatchMenu.tsx`
- Create: `src/components/MatchMenu.test.tsx`
- Modify: `src/components/TableControls.tsx`
- Modify: `src/components/PreferencesMenu.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Write failing `MatchMenu` behavior tests**

  Cover the closed `Partita` button; opening the player-count selector, `Nuova partita`, `Azzera punteggi`, and Wake Lock preference; all callbacks; Escape focus restoration; and the outside-dismiss fallback when `showPopover` is unavailable.

- [ ] **Run the focused test and confirm the expected failure**

  Run: `npm test -- src/components/MatchMenu.test.tsx`

  Expected: FAIL because `MatchMenu` does not exist.

- [ ] **Extract reusable preference content**

  In `PreferencesMenu.tsx`, export `KeepScreenOnOption` with the existing checkbox, help/status copy, and callback behavior. Keep `PreferencesMenu` as the standard header wrapper around it.

- [ ] **Implement `MatchMenu` with native and fallback paths**

  Follow the feature-detection and focus-restoration pattern already established by `PreferencesMenu`. Keep the player-count draft local and synchronize it when `currentPlayerCount` changes.

- [ ] **Run `MatchMenu` tests and confirm they pass**

  Run: `npm test -- src/components/MatchMenu.test.tsx`

  Expected: PASS.

- [ ] **Write failing compact-header integration assertions**

  Assert that compact mode keeps the brand mark, Undo, Redo, and `Partita` top-level; hides the brand wordmark and raw match/preference controls; and reveals their equivalents inside `Partita`.

- [ ] **Refactor `TableControls` to a typed compact/standard split**

  Replace `extra?: ReactNode` with the preference props. Preserve the current standard structure and use the text label `Partita` in compact mode.

- [ ] **Run all affected tests**

  Run: `npm test -- src/components/MatchMenu.test.tsx src/App.test.tsx`

  Expected: PASS.

- [ ] **Commit Task 2**

  ```bash
  git add src/components/MatchMenu.tsx src/components/MatchMenu.test.tsx src/components/TableControls.tsx src/components/PreferencesMenu.tsx src/App.tsx src/App.test.tsx
  git commit -m "feat: add compact match menu"
  ```

---

### Task 3: Split player details from the compact scoring rail

**Files:**

- Create: `src/components/DeltaBadge.tsx`
- Create: `src/components/PlayerDetailsContent.tsx`
- Create: `src/components/ModalSideSheet.tsx`
- Create: `src/components/PlayerDetailsDialog.tsx`
- Create: `src/components/PlayerDetailsDialog.test.tsx`
- Modify: `src/components/PlayerPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Write failing side-sheet interaction tests**

  Test the two compact rows and `[−5][−1] LIFE [+1][+5]` order; the accessible dialog name `Dettagli di <nome>`; open/close/Escape/focus restoration; defeat → Commander → counters → deck/Partner → remove content order; preserved Commander disclosure state across close/reopen; no remove or Partner badge on the compact panel; and remove → closed sheet → focused Undo bar in the removed cell → restored player.

- [ ] **Run the focused tests and confirm the expected failure**

  Run: `npm test -- src/components/PlayerDetailsDialog.test.tsx src/App.test.tsx`

  Expected: FAIL because compact player details are not implemented.

- [ ] **Extract delta and details primitives without semantic changes**

  Move `PanelDelta`, target comparison, and badge rendering into `DeltaBadge.tsx`. Move defeat, Commander, counters, deck configuration, and Partner configuration into `PlayerDetailsContent.tsx`; render the destructive action only when an optional remove callback is supplied.

- [ ] **Implement the focus-managed side sheet**

  Implement `ModalSideSheet` once: use native `dialog` when `showModal` exists and an explicit `role="dialog"`, `aria-modal`, inert-background/focus-trap fallback otherwise. It owns Escape, close, initial focus, and opener restoration. `PlayerDetailsDialog` supplies the player label and presentation class.

- [ ] **Refactor `PlayerPanel` into standard and compact presentations**

  Rebuild standard mode from the extracted content without behavior changes. Keep Commander disclosure state in `PlayerPanel`, above both presentations. In compact mode render the identity/details row, fixed life rail, absolute delta overlay, and details sheet. Close the sheet before dispatching the existing remove action.

- [ ] **Run focused tests and the existing scoring suite**

  Run: `npm test -- src/components/PlayerDetailsDialog.test.tsx src/App.test.tsx`

  Expected: PASS, including rapid-tap and history assertions.

- [ ] **Commit Task 3**

  ```bash
  git add src/components/DeltaBadge.tsx src/components/PlayerDetailsContent.tsx src/components/ModalSideSheet.tsx src/components/PlayerDetailsDialog.tsx src/components/PlayerDetailsDialog.test.tsx src/components/PlayerPanel.tsx src/App.tsx src/App.test.tsx
  git commit -m "feat: add compact player details sheet"
  ```

---

### Task 4: Collapse active notices into `Stato app`

**Files:**

- Modify: `src/components/AppNotices.tsx`
- Create: `src/components/AppNotices.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Write failing notice-mode tests**

  Assert standard inline notices; no compact trigger without notices; exactly one `Stato app` trigger for one or both notices; all active actions inside it; focus restoration; and operation without the Popover API.

- [ ] **Run the focused test and confirm the expected failure**

  Run: `npm test -- src/components/AppNotices.test.tsx`

  Expected: FAIL because `AppNotices` has no compact mode.

- [ ] **Implement compact and standard notice presentations**

  Reuse the same notice body/actions. Compact mode uses a conditional top-layer popover/fallback and reserves no block space below the header. Include the active-notice count in the accessible name or description and a non-color warning marker in the trigger.

- [ ] **Move compact notices into the header composition**

  Keep inline placement in standard mode. Compact header order is brand mark, Undo, Redo, conditional `Stato app`, future `Regole`, `Partita`.

- [ ] **Run affected tests**

  Run: `npm test -- src/components/AppNotices.test.tsx src/App.test.tsx`

  Expected: PASS.

- [ ] **Commit Task 4**

  ```bash
  git add src/components/AppNotices.tsx src/components/AppNotices.test.tsx src/App.tsx src/App.test.tsx
  git commit -m "feat: compact application notices"
  ```

---

### Task 5: Implement responsive geometry and verify approved viewports

**Files:**

- Modify: `src/styles/app.css`
- Modify: `src/App.test.tsx`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PLAYTEST_CHECKLIST.md`

- [ ] **Add structural assertions before styling**

  Assert stable class/data hooks for the compact shell, header, grid, score rail, and side sheet so CSS never depends on translated copy or fragile DOM position.

- [ ] **Run the focused test and confirm missing hooks fail**

  Run: `npm test -- src/App.test.tsx`

  Expected: FAIL only for newly required hooks.

- [ ] **Add the stable hooks and compact CSS**

  Under the exact media query, cap the header at 52px; hide only the wordmark; use `100dvh` plus `env(safe-area-inset-*)`; implement 4p 2×2, 3p three columns from 44rem otherwise 2+spanning, and 2p two columns without stretching control targets; enforce the two panel rows; hide the sigil; overlay deltas; size the sheet to 8px inset, `height: calc(100dvh - 16px)`, `max-width: 28rem`; and add zoom-safe vertical reflow, 44px targets, no horizontal overflow, and instant reveals under `prefers-reduced-motion: reduce`.

- [ ] **Run unit/integration verification**

  Run: `npm run verify`

  Expected: typecheck, lint, test, and build all pass.

- [ ] **Run viewport verification in a browser**

  Start: `npm run dev -- --host 127.0.0.1`

  Verify and record in `docs/PLAYTEST_CHECKLIST.md`:

  - 844×390 and 844×330, four players: no document scroll; all panels and twenty life controls visible;
  - 844×390 with two and three players: approved grid distribution;
  - 390×844 portrait, 768px, and 1440px: standard layout unchanged;
  - 844×390 at 200% zoom: targets remain at least 44×44, vertical reflow is allowed, no horizontal scroll;
  - long names and life `-10`, `100`, `999` do not overlap controls;
  - keyboard traversal covers header, menus, sheet, remove, close, and restored focus;
  - both notices active: one `Stato app` trigger and no lost grid height.
  - simulated iOS safe-area insets do not cover the header or bottom-row controls;
  - with `prefers-reduced-motion: reduce`, menus, notices, deltas, and the side sheet reveal without meaningful animation;
  - accessible names announce each life adjustment with player name and signed amount, and every icon-only action has a text alternative.

- [ ] **Update project documentation**

  Add the presentation decision to `docs/DECISIONS.md`. Mark Phase 1.6 complete in `docs/ROADMAP.md` only after all checks pass. Keep rules pending.

- [ ] **Run final verification**

  Stop the dev server, then run: `npm run verify`

  Expected: PASS with no skipped or newly failing tests.

- [ ] **Commit Task 5**

  ```bash
  git add src/styles/app.css src/App.test.tsx docs/DECISIONS.md docs/ROADMAP.md docs/PLAYTEST_CHECKLIST.md
  git commit -m "feat: complete compact landscape layout"
  ```

---

## Completion Gate

- [ ] Every approved requirement has an automated assertion or explicit viewport check.
- [ ] Standard desktop and portrait play remain behaviorally and visually intact.
- [ ] No reducer, persistence, history, or storage-contract diff exists.
- [ ] `npm run verify` passes after documentation updates.
- [ ] The implementation is reviewed before rules work begins.
