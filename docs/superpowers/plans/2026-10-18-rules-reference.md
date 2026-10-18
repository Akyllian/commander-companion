# Rules Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved offline Italian rules reference, accessible from both standard and compact headers, without altering game state or scoring behavior.

**Architecture:** Represent the seven reviewed rules as typed static content whose numeric thresholds come from existing domain constants. A presentation-only `RulesDialog` renders the content as one scrollable document in a focus-managed right-side sheet. `App` owns only the open state, while `TableControls` supplies the correctly ordered trigger in standard and compact layouts.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, CSS, and the Phase 1.6 `ModalSideSheet` primitive.

**Spec:** [Rules Reference Design](../specs/2026-10-18-rules-reference-design.md)

## Global Constraints

- Begin only after the compact-landscape plan is implemented and verified in the working tree.
- Treat the approved Italian copy, R1–R7 identifiers, reference lines, group order, and effective date as product content, not placeholder text.
- Derive life, poison, and Commander-damage numbers from existing domain constants; do not duplicate magic numbers in component JSX.
- The rules surface is one scrollable document: no tabs, search, accordions, or rule cards in this phase.
- Do not mutate `GameState`, dispatch actions, change persistence, or influence score calculations when opening, reading, or closing the rules.
- Reuse the shared `ModalSideSheet` native-dialog/fallback behavior delivered by Phase 1.6.
- At 200% zoom, vertical scrolling is allowed; horizontal scrolling is not.
- Run focused tests after every red/green step and `npm run verify` before completion.

## Review Focus

- A future domain-constant change updates rule copy without editing JSX; Task 1 owns the automated test.
- Rule R7 exposes `{2}` visually while screen readers receive an understandable mana-cost label; Task 2 owns the automated test.
- Escape, close, focus trap, and return-to-trigger work in native and fallback paths; Task 2 owns the automated tests.
- `Regole` appears in the exact approved header position in standard and compact modes; Task 3 owns the integration tests.
- Opening and closing rules leaves the current game and history unchanged; Task 3 owns the integration test.

---

## File Map

### Create

- `src/content/rules.ts` — typed groups, items, fragments, references, and effective date.
- `src/content/rules.test.ts` — completeness, ordering, constant interpolation, and plain-text tests.
- `src/components/RulesDialog.tsx` — accessible right-side rules sheet and document rendering.
- `src/components/RulesDialog.test.tsx` — content, semantics, focus, keyboard, and fallback tests.

### Modify

- `src/App.tsx` — own rules-open state, connect trigger, and render the dialog.
- `src/App.test.tsx` — standard/compact ordering, unchanged game state, and integration tests.
- `src/components/TableControls.tsx` — add the top-level `Regole` action in both presentations.
- `src/components/PlayerDetailsContent.tsx` — replace Commander helper copy with the approved sentence.
- `src/game/game.ts` — name and export the existing zero-life defeat threshold for content reuse.
- `src/styles/app.css` — standard and compact rules-sheet geometry and document typography.
- `docs/DESIGN_SYSTEM.md` — document rules-sheet component usage and content hierarchy.
- `docs/DECISIONS.md` — record the static-content and one-document decisions.
- `docs/ROADMAP.md` — mark the rules-reference phase complete only after verification.
- `docs/PLAYTEST_CHECKLIST.md` — add offline, zoom, keyboard, and copy checks.

## Public Interfaces

Implement the content contracts directly in `src/content/rules.ts`:

```ts
export type RuleGroupId = 'thresholds' | 'commander' | 'command-zone'
export type RuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7'

export interface RuleTextPart {
  text: string
  emphasis?: boolean
  accessibleLabel?: string
}

export interface RuleItem {
  id: RuleId
  group: RuleGroupId
  title: string
  body: readonly RuleTextPart[]
  references: readonly string[]
  status?: 'not-tracked'
}

export interface RuleGroup {
  id: RuleGroupId
  title: string
}

export const RULES_EFFECTIVE_DATE = '2026-09-25'
export const RULES_INTRODUCTION: string
export const RULES_DISCLAIMER: string
export const RULE_GROUPS: readonly RuleGroup[]
export const RULE_ITEMS: readonly RuleItem[]
export function rulePlainText(item: RuleItem): string
```

Add these presentation contracts:

```ts
interface RulesDialogProps {
  open: boolean
  onClose: () => void
}
```

```ts
interface TableControlsProps {
  // existing Phase 1.6 props remain unchanged
  onOpenRules: () => void
}
```

The dialog imports the introduction, date, disclaimer, groups, and items; it must not own a second content copy.

---

### Task 1: Encode the approved rules as typed static content

**Files:**

- Create: `src/content/rules.ts`
- Create: `src/content/rules.test.ts`
- Modify: `src/game/game.ts`
- Read: `docs/superpowers/specs/2026-10-18-rules-reference-design.md`

- [ ] **Write failing content-contract tests**

  Assert the exact introduction and disclaimer; group order `Soglie della partita`, `Danni Commander`, `Zona di comando`; R1–R7 without duplicates or gaps; expected group membership and references; date `2026-09-25` displayed as `25 settembre 2026`; imported life, zero-life, poison, and Commander thresholds in R1–R4; R5 automatic life reduction; R6 separate Partner tracking; R7 `not-tracked` status and accessible `{2}` fragment; and lossless `rulePlainText` spacing/punctuation.

- [ ] **Run the focused test and confirm the expected failure**

  Run: `npm test -- src/content/rules.test.ts src/game/game.test.ts`

  Expected: FAIL because the module does not exist.

- [ ] **Name the existing zero-life threshold**

  Export `LIFE_DEFEAT_LIMIT = 0` from `src/game/game.ts` and replace the literal comparison in `getDefeatReasons` with it. Add or retain the reducer/domain assertion that life at zero is defeated, so this is a behavior-preserving extraction.

- [ ] **Implement the typed content module**

  Copy the approved Italian text and reference lines exactly from the spec. Interpolate existing constants into fragments. Keep visible `{2}` plus `accessibleLabel: 'due mana generici'`. Use readonly types rather than runtime mutation logic.

- [ ] **Run content tests and confirm they pass**

  Run: `npm test -- src/content/rules.test.ts src/game/game.test.ts`

  Expected: PASS.

- [ ] **Commit Task 1**

  ```bash
  git add src/game/game.ts src/content/rules.ts src/content/rules.test.ts
  git commit -m "feat: add typed commander rules content"
  ```

---

### Task 2: Build the accessible one-document rules sheet

**Files:**

- Create: `src/components/RulesDialog.tsx`
- Create: `src/components/RulesDialog.test.tsx`
- Read: `src/components/ModalSideSheet.tsx`
- Read: `src/content/rules.ts`

- [ ] **Write failing rendering and accessibility tests**

  Cover the `Regole Commander` dialog name; title, date, and close button; group/R1–R7 order; associated references; visible and accessible R7 mana cost plus `Non tracciata dall’app`; one scroll region without tabs/cards/disclosures; focus entry/trap/Escape/return; and equivalent fallback behavior without `showModal`.

- [ ] **Run the focused test and confirm the expected failure**

  Run: `npm test -- src/components/RulesDialog.test.tsx`

  Expected: FAIL because `RulesDialog` does not exist.

- [ ] **Implement the dialog and document renderer**

  Compose the Phase 1.6 `ModalSideSheet` primitive; do not copy focus management or inherit destructive confirmation styling. Use semantic headings and ordered content, supporting reference text, and a textual untracked status. Accept only `open` and `onClose`.

- [ ] **Run dialog and content tests**

  Run: `npm test -- src/components/RulesDialog.test.tsx src/content/rules.test.ts`

  Expected: PASS.

- [ ] **Commit Task 2**

  ```bash
  git add src/components/RulesDialog.tsx src/components/RulesDialog.test.tsx
  git commit -m "feat: add accessible rules reference sheet"
  ```

---

### Task 3: Integrate `Regole` into standard and compact headers

**Files:**

- Modify: `src/components/TableControls.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Write failing header and state-isolation tests**

  In standard mode assert `Regole` after `Azzera punteggi` and before `Preferenze`. In compact mode assert it immediately before `Partita` while match actions remain inside `Partita`.

  Start a game, change life, and create Undo history. Capture player values and Undo/Redo states. Open and close `Regole` by button and Escape, then assert all captured values remain unchanged and focus returns to the trigger. In compact mode, open player details first and verify the modal background prevents opening `Regole` until details closes, so two modal sheets cannot coexist.

- [ ] **Run the App test and confirm the expected failure**

  Run: `npm test -- src/App.test.tsx`

  Expected: FAIL because the trigger and App state do not exist.

- [ ] **Add the typed trigger callback to `TableControls`**

  Add `onOpenRules`, preserve the exact standard and compact order, and keep the visible text label `Regole`.

- [ ] **Own presentation state in `App`**

  Add `rulesOpen`, pass its opener to `TableControls`, and render one `RulesDialog` with the other top-layer surfaces. Do not dispatch or persist this state.

- [ ] **Run affected tests**

  Run: `npm test -- src/App.test.tsx src/components/RulesDialog.test.tsx`

  Expected: PASS.

- [ ] **Commit Task 3**

  ```bash
  git add src/components/TableControls.tsx src/App.tsx src/App.test.tsx
  git commit -m "feat: open rules from game header"
  ```

---

### Task 4: Apply approved helper copy and responsive sheet styling

**Files:**

- Modify: `src/components/PlayerDetailsContent.tsx`
- Modify: `src/components/RulesDialog.test.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles/app.css`

- [ ] **Write failing approved-copy and structure assertions**

  Assert the exact helper sentence `Registra qui solo i danni da combattimento del comandante: riducono anche i punti vita.` and stable hooks for the sheet, sticky header, scroll region, groups, references, mana symbol, and untracked label.

- [ ] **Run focused tests and confirm the expected failure**

  Run: `npm test -- src/App.test.tsx src/components/RulesDialog.test.tsx`

  Expected: FAIL for old copy and missing hooks.

- [ ] **Replace helper text and add stable hooks**

  Change only the explanatory sentence, never Commander scoring logic. Keep CSS independent of visible Italian text.

- [ ] **Implement standard and compact geometry**

  Use a right-side sheet with `max-width: 36rem` on standard layouts, 8px viewport inset in compact landscape, sticky header, one vertically scrollable body, readable group separation without card chrome, visible focus, textual status, and no horizontal overflow at 200% zoom.

- [ ] **Run focused and full verification**

  Run: `npm test -- src/App.test.tsx src/components/RulesDialog.test.tsx src/content/rules.test.ts`

  Then run: `npm run verify`

  Expected: PASS.

- [ ] **Commit Task 4**

  ```bash
  git add src/components/PlayerDetailsContent.tsx src/components/RulesDialog.test.tsx src/App.test.tsx src/styles/app.css
  git commit -m "feat: style responsive rules reference"
  ```

---

### Task 5: Verify offline behavior, accessibility, and documentation

**Files:**

- Modify: `docs/DESIGN_SYSTEM.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PLAYTEST_CHECKLIST.md`

- [ ] **Build and serve the production app**

  Run: `npm run build`

  Then run: `npm run preview -- --host 127.0.0.1`

  Expected: production assets build and the app opens without a network request for rule content.

- [ ] **Verify the standard viewport**

  Confirm exact trigger position; 36rem right sheet; exact R1–R7 content, references, date, and untracked status; keyboard focus/Escape/return; and unchanged game/history values.

- [ ] **Verify compact landscape and zoom**

  At 844×390 and 844×330 confirm `Regole` immediately before `Partita`, an 8px-inset sheet, and unchanged grid behind it. At 200% zoom confirm vertical reading, 44×44 targets, and no horizontal scroll.

- [ ] **Verify offline use**

  Load the built app once, disable network access, reload through the installed/service-worker path supported by the project, and open all rule content. Record the outcome in `docs/PLAYTEST_CHECKLIST.md`.

- [ ] **Update documentation**

  Document the component and hierarchy in `docs/DESIGN_SYSTEM.md`; record the static-content/one-document decision in `docs/DECISIONS.md`; add verified cases to `docs/PLAYTEST_CHECKLIST.md`; mark the roadmap phase complete only after every check passes.

- [ ] **Stop preview and run final verification**

  Run: `npm run verify`

  Expected: PASS with no skipped or newly failing tests.

- [ ] **Commit Task 5**

  ```bash
  git add docs/DESIGN_SYSTEM.md docs/DECISIONS.md docs/ROADMAP.md docs/PLAYTEST_CHECKLIST.md
  git commit -m "docs: record rules reference verification"
  ```

---

## Completion Gate

- [ ] Phase 1.6 compact landscape is complete and verified.
- [ ] Every approved sentence, reference, identifier, group, threshold, and date is covered by content or rendering tests.
- [ ] Rules remain available after an offline reload of the built app.
- [ ] Opening and closing the sheet produces no game-state, history, or persistence change.
- [ ] Standard, compact, keyboard, fallback, and 200% zoom checks pass.
- [ ] `npm run verify` passes after documentation updates.
