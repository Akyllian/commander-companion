# Direct Scoring Dock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Commander damage, the curated counters, Commander tax, Monarch and Initiative operable from every main player panel without opening an overlay.

**Architecture:** Extend the validated game domain and v4 persistence schema before changing the UI. A focused `QuickScoreDock` owns presentation-only mode/source selection, while every score mutation still travels through `GameAction`, `historyReducer` and the existing synchronous persistence path. Keep deck configuration and destructive actions in Details; remove scoring controls from that sheet after the dock is complete.

**Tech Stack:** React 19, TypeScript 7, CSS, Vitest, Testing Library, fast-check, localStorage

**Spec:** `docs/superpowers/specs/2026-10-19-direct-scoring-design.md`

## Global Constraints

- Keep life visually dominant and preserve `[−5] [−1] value [+1] [+5]`.
- No score requires a details disclosure, popover, modal or side sheet.
- Every interactive target is at least 44×44 px; 200% zoom may reflow or scroll, never clip.
- Commander damage still changes life atomically in one history step.
- Partner commanders remain distinct for incoming damage and Commander tax.
- Motion is 120 ms for mode/source changes and 140 ms for table-role transfer; reduced motion is immediate.
- Reuse the canonical dark-fantasy gold/teal system and D-031 contrast rules; do not ship emoji icons.
- Do not add dependencies.

## Review Focus

- A v4 save migrates without losing names, art, damage or counters and initializes every new field safely.
- Removing/disabling Partner cannot orphan nonzero Commander-2 tax.
- Removing a player clears their source damage and any Monarch/Initiative ownership without invalid references.
- Rapid taps group only when player, value, direction and Commander slot/source are identical.
- At 844×330 and 200% zoom all modes remain keyboard/touch reachable even when vertical scrolling is required.

---

### Task 1: Extend the scoring domain and schema

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/game.ts`
- Modify: `src/game/game.test.ts`
- Modify: `src/game/invariants.test.ts`

**Interfaces:**
- Produces: `TableRole = 'monarch' | 'initiative'`
- Produces: `CounterKey = 'poison' | 'energy' | 'experience' | 'rad'`
- Produces: `CommanderTaxBySlot = [number, number]`
- Produces: actions `adjust-commander-tax` and `set-table-role`
- Produces: schema-v5 `PlayerState.rad`, `PlayerState.commanderTax`, `GameState.monarchPlayerId`, `GameState.initiativePlayerId`

- [ ] **Step 1: Write failing reducer and invariant tests**

  Cover defaults; nonnegative rad; tax changing only in multiples of two; distinct Partner slots; invalid player/slot/amount no-ops; unique Monarch/Initiative ownership; same player holding both; reset; removal; and `canRemovePartner` returning false while Commander-2 damage or tax is nonzero.

- [ ] **Step 2: Run the focused tests and confirm the new cases fail**

  Run: `npm test -- src/game/game.test.ts src/game/invariants.test.ts`  
  Expected: FAIL because the new fields/actions do not exist.

- [ ] **Step 3: Implement the v5 types and pure reducer behavior**

  `adjust-commander-tax` accepts a safe nonzero multiple of two and clamps to `0…COUNTER_MAX`. `set-table-role` accepts an existing player id or `null`; the UI, not the reducer, converts a second tap on the current owner to `null`. Reset clears all new scores/states but preserves identity, Partner and Commander art.

- [ ] **Step 4: Run the focused tests**

  Run: `npm test -- src/game/game.test.ts src/game/invariants.test.ts`  
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/game/types.ts src/game/game.ts src/game/game.test.ts src/game/invariants.test.ts
  git commit -m "feat: add frequent Commander score state"
  ```

### Task 2: Migrate, persist and group the new values

**Files:**
- Modify: `src/game/storage.ts`
- Modify: `src/game/storage.test.ts`
- Modify: `src/game/history.ts`
- Modify: `src/game/history.test.ts`
- Modify: `src/components/DeltaBadge.tsx`

**Interfaces:**
- Consumes: schema-v5 fields and actions from Task 1
- Produces: v4→v5 migration and history targets for rad/tax

- [ ] **Step 1: Write failing migration and history tests**

  Assert exact v4 preservation plus `rad: 0`, `commanderTax: [0, 0]`, `monarchPlayerId: null`, `initiativePlayerId: null`; reject malformed v5 values/references; round-trip v5; group repeated rad and same-slot tax taps; keep different slots/directions in separate undo steps; expose correct deltas.

- [ ] **Step 2: Run the focused tests and confirm failure**

  Run: `npm test -- src/game/storage.test.ts src/game/history.test.ts`  
  Expected: FAIL on schema version and missing group targets.

- [ ] **Step 3: Implement migration, validation and grouping**

  Add a dedicated `migrateV4`; do not mutate or weaken older migrations. Extend `GroupTarget` with `{ kind: 'commander-tax'; playerId; commander }`; rad continues through the counter target. Table-role transfers remain individual history steps.

- [ ] **Step 4: Run storage/history tests**

  Run: `npm test -- src/game/storage.test.ts src/game/history.test.ts`  
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/game/storage.ts src/game/storage.test.ts src/game/history.ts src/game/history.test.ts src/components/DeltaBadge.tsx
  git commit -m "feat: persist and undo frequent scores"
  ```

### Task 3: Build the direct scoring dock

**Files:**
- Create: `src/components/QuickScoreDock.tsx`
- Create: `src/components/QuickScoreDock.test.tsx`
- Modify: `src/components/icons.tsx`
- Modify: `src/components/PlayerPanel.tsx`
- Modify: `src/components/PlayerSections.tsx`
- Create: `src/components/PlayerPanel.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `PlayerState`, opponents, `PanelDelta`, current table-role owners and `dispatch(GameAction)`
- Produces: `QuickScoreDock` with local `ScoreMode`, selected Commander damage source and selected tax slot
- Produces: callbacks for toggling Monarch/Initiative ownership

- [ ] **Step 1: Write failing component and integration tests**

  Assert mode order/copy, `aria-pressed`, 44px semantic buttons, in-place switching without dialog/details, life rail preservation, counter ±1, tax ±2, Commander opponent/Partner source labels, automatic life loss, session-local source memory, Monarch/Initiative transfer/removal, stable focus and complete accessible names.

- [ ] **Step 2: Run the focused tests and confirm failure**

  Run: `npm test -- src/components/QuickScoreDock.test.tsx src/components/PlayerPanel.test.tsx src/App.test.tsx`  
  Expected: FAIL because `QuickScoreDock` is absent.

- [ ] **Step 3: Implement `QuickScoreDock` and integrate it**

  Keep `activeMode` and selected sources in `PlayerPanel`/dock local state. Render the dock in both standard and compact presentations. Remove `CommanderSection` and `OtherCountersSection` from the Details sheet only after equivalent direct controls pass. Keep Commander/deck selection, credits, defeat detail and removal in Details.

- [ ] **Step 4: Run the focused tests**

  Run: `npm test -- src/components/QuickScoreDock.test.tsx src/components/PlayerPanel.test.tsx src/App.test.tsx`  
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/QuickScoreDock.tsx src/components/QuickScoreDock.test.tsx src/components/icons.tsx src/components/PlayerPanel.tsx src/components/PlayerSections.tsx src/components/PlayerPanel.test.tsx src/App.tsx src/App.test.tsx
  git commit -m "feat: expose scores on player panels"
  ```

### Task 4: Apply visual, responsive and motion rules

**Files:**
- Modify: `src/styles/app.css`
- Modify: `src/styles/tokens.css`
- Modify: `src/App.test.tsx`
- Modify: `docs/DESIGN_SYSTEM.md`

**Interfaces:**
- Consumes: dock DOM/classes from Task 3
- Produces: continuous mode strip, stable score rail, compact scroll behavior and reduced-motion override

- [ ] **Step 1: Add failing structural/responsive assertions**

  Assert one labelled mode group per panel, no scoring control inside the Details dialog, selected state independent of color, and stable DOM after mode changes. Add the approved visual viewport cases to the documented manual check.

- [ ] **Step 2: Implement the dock styling**

  Use one continuous dark surface with gold hairlines, teal/gold active state, tabular numbers and authored line icons. In compact density share the identity row and allow only the internal strip to scroll horizontally. Preserve 44px controls; allow vertical document scroll at 844×330/200% rather than clipping.

- [ ] **Step 3: Implement motion and reduced motion**

  Mode/source content: 120 ms opacity plus 2px settle. Role transfer: 140 ms local disappear/appear. Do not animate layout properties or values. Disable transforms/animations under `prefers-reduced-motion: reduce`.

- [ ] **Step 4: Run automated verification**

  Run: `npm run verify`  
  Expected: typecheck, lint, coverage and build all PASS.

- [ ] **Step 5: Perform visual verification**

  Check 320×568, 390×844, 844×390, 844×330, 768px, 1440px and 200% zoom with no art, bright art, Partner art, long names and maximum-width values. Confirm keyboard/touch access to every mode and no page-level horizontal scroll.

- [ ] **Step 6: Commit**

  ```bash
  git add src/styles/app.css src/styles/tokens.css src/App.test.tsx docs/DESIGN_SYSTEM.md
  git commit -m "style: finish direct scoring dock"
  ```

### Task 5: Align rules and project records

**Files:**
- Modify: `src/content/rules.ts`
- Modify: `src/content/rules.test.ts`
- Modify: `docs/superpowers/specs/2026-10-18-rules-reference-design.md`
- Modify: `docs/PLAYTEST_CHECKLIST.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/ROADMAP.md`

**Interfaces:**
- Consumes: shipped behavior from Tasks 1–4
- Produces: truthful R7 copy, playtest coverage and implemented status for D-033

- [ ] **Step 1: Write the failing R7 content test**

  Replace `Non tracciata dall’app` with copy explaining `+{2}` per additional command-zone cast and separate Partner tracking; assert the status badge is removed.

- [ ] **Step 2: Update content and design records**

  Update R7, the rules spec, playtest steps for every new value/status, D-033 evidence and roadmap status. Do not claim phone/table verification until it has actually been performed.

- [ ] **Step 3: Run final verification**

  Run: `npm run verify`  
  Expected: PASS.

- [ ] **Step 4: Commit**

  ```bash
  git add src/content/rules.ts src/content/rules.test.ts docs/superpowers/specs/2026-10-18-rules-reference-design.md docs/PLAYTEST_CHECKLIST.md docs/DECISIONS.md docs/ROADMAP.md
  git commit -m "docs: align rules with tracked Commander tax"
  ```
