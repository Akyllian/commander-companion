# Commander Companion MVP Starter

A responsive, local-first Commander life counter built with React, TypeScript and Vite. The starter includes a functional scoring table, fantasy design tokens, tests, implementation planning and Claude Code guidance.

## Included in the MVP

- 2–4 player tables with 40 starting life
- Life controls for ±1 and ±5
- Poison, energy and experience counters
- Incoming Commander damage by opponent, also reducing life, with partner commanders tracked separately
- Defeat indicators for 0 life, 10 poison or 21 damage from one commander
- Undo/redo (buttons and Ctrl/Cmd+Z) with rapid taps grouped into one step, confirmed reset and new-game dialogs, undoable player removal
- Local persistence with schema migration, corrupt-save backup and multi-tab sync
- Installable PWA that works offline; updates wait for confirmation
- Screen kept awake during play where supported (can be turned off)
- Responsive desktop/mobile layout and reduced-motion support

## Start locally

Requirements: Node.js 22.22.2+ (or 24.15+) and npm 10 or newer.

```bash
npm install
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

## Verify

```bash
npm run verify   # typecheck + lint + tests with coverage + production build
```

Single steps: `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run build`.
To try the offline app: `npm run build && npm run preview`, open the page once, then stop the server and reload.

## Deploy

Live: https://akyllian.github.io/commander-companion/ — deployed automatically from `main` after CI passes.

The build in `dist/` is a static site. Phones install it and run it offline only over **HTTPS**.
For hosts that serve from a subfolder (e.g. GitHub Pages at `/<repo>/`), build with:

```bash
BASE_PATH=/commander-companion/ npm run build
```

CI (`.github/workflows/ci.yml`) runs `npm run verify` on Node 22 and 24. Real-device testing follows `docs/PLAYTEST_CHECKLIST.md`.

## Project map

```text
src/
  components/       focused UI components
  game/             state types, reducer, history and persistence
  platform/         browser adapters (wake lock)
  pwa/              service worker registration and update state
  styles/           three-layer tokens and component CSS
  test/             test environment setup
docs/
  ROADMAP.md         phases, status and working rules
  ARCHITECTURE.md    boundaries, rules, schema and extension paths
  DECISIONS.md       architectural decision log
  PLAN_FASE_0_1.md   phase 0–1 technical plan
  UX_REVIEW_FASE_1.md  handoff for UX review
  PLAYTEST_CHECKLIST.md  real-device test plan (phase 1.5)
  DESIGN_SYSTEM.md   tokens, states and accessibility
  superpowers/       product spec and implementation plan
CLAUDE.md            working agreement for Claude Code
PRODUCT.md           product context
DESIGN.md            visual direction
```

## Roadmap

Next phases, dependencies and working rules are in [`docs/ROADMAP.md`](docs/ROADMAP.md): compact landscape layout, rules reference, match history, player images and a tablet table view.

## Fan Content Policy

Commander Companion is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.

The app is free for everyone, with no paywall, registration or sale, and uses no Wizards logos or trademarks as branding (D-025). See the [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy).

