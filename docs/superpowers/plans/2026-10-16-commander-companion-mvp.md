# Commander Companion MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a tested, responsive Commander life-counter starter with local persistence and a documented fantasy design system.

**Architecture:** Pure TypeScript game state and reducer code sit below focused React components. `App` owns history and persistence; player panels render the active snapshot and dispatch typed actions. CSS is organized as a three-layer token system followed by component and responsive rules.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Vitest 5, Testing Library, CSS custom properties.

**Spec:** `docs/superpowers/specs/2026-10-16-commander-companion-mvp-design.md`

## Global Constraints

- Support 2–4 players and start at 40 life.
- Keep all score changes keyboard accessible with 44px minimum hit targets.
- Persist only validated current state; keep undo history in memory.
- Respect `prefers-reduced-motion`.
- Do not add cloud, accounts, card APIs or media upload to this MVP.

## Review Focus

- Corrupted local storage falls back to a valid default match.
- Counter decrement never produces a negative poison or Commander value.
- Removing a player also removes Commander-damage references to that player.
- Life may fall below zero without crashing or silently clamping.
- A reset keeps player identity but clears gameplay counters.

---

### Task 1: Game domain and reducer

**Files:**
- Create: `src/game/types.ts`
- Create: `src/game/game.ts`
- Test: `src/game/game.test.ts`

**Interfaces:**
- Consumes: no earlier application interfaces.
- Produces: `GameState`, `GameAction`, `createGame`, `gameReducer`, `isPlayerDefeated`.

- [ ] **Step 1: Write failing reducer tests**
- [ ] **Step 2: Run `npm test -- src/game/game.test.ts` and confirm missing-module failure**
- [ ] **Step 3: Implement the typed factory and reducer**
- [ ] **Step 4: Run the focused tests and confirm they pass**
- [ ] **Step 5: Commit `feat: add commander game domain`**

### Task 2: Persistent application UI

**Files:**
- Create: `src/game/storage.ts`
- Create: `src/components/PlayerPanel.tsx`
- Create: `src/components/TableControls.tsx`
- Create: `src/App.tsx`
- Create: `src/App.test.tsx`
- Create: `src/main.tsx`

**Interfaces:**
- Consumes: `GameState`, `GameAction`, `createGame`, `gameReducer`, `isPlayerDefeated` from Task 1.
- Produces: a rendered scoring table with undo, redo, reset and persistence.

- [ ] **Step 1: Write a failing interaction test for changing life**
- [ ] **Step 2: Run `npm test -- src/App.test.tsx` and confirm missing-component failure**
- [ ] **Step 3: Implement storage, components and application composition**
- [ ] **Step 4: Run focused and full tests**
- [ ] **Step 5: Commit `feat: build persistent scoring table`**

### Task 3: Fantasy design system and handoff documentation

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/app.css`
- Create: `PRODUCT.md`
- Create: `DESIGN.md`
- Create: `README.md`
- Create: `CLAUDE.md`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/DESIGN_SYSTEM.md`

**Interfaces:**
- Consumes: semantic class names and component structure from Task 2.
- Produces: three-layer tokens, responsive presentation, build/run instructions and continuation constraints.

- [ ] **Step 1: Add the token layers and responsive component styles**
- [ ] **Step 2: Add product, architecture, design-system and Claude Code guidance**
- [ ] **Step 3: Run `npm run build` and `npm test`**
- [ ] **Step 4: Inspect at desktop and mobile viewport widths**
- [ ] **Step 5: Commit `docs: complete mvp starter handoff`**

