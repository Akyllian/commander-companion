# Commander Companion MVP Starter

A responsive, local-first Commander life counter built with React, TypeScript and Vite. The starter includes a functional scoring table, fantasy design tokens, tests, implementation planning and Claude Code guidance.

## Included in the MVP

- 2–4 player tables with 40 starting life
- Life controls for ±1 and ±5
- Poison, energy and experience counters
- Incoming Commander damage by opponent
- Defeat indicators for 0 life, 10 poison or 21 Commander damage
- Undo/redo, score reset and new-game flow
- Local browser persistence
- Responsive desktop/mobile layout and reduced-motion support

## Start locally

Requirements: Node.js 22 or newer and npm 10 or newer.

```bash
npm install
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

## Verify

```bash
npm test
npm run build
```

## Project map

```text
src/
  components/       focused UI components
  game/             state types, reducer and persistence
  styles/           three-layer tokens and component CSS
  test/             test environment setup
docs/
  ARCHITECTURE.md    boundaries and extension paths
  DESIGN_SYSTEM.md   tokens, states and accessibility
  superpowers/       product spec and implementation plan
CLAUDE.md            working agreement for Claude Code
PRODUCT.md           product context
DESIGN.md            visual direction
```

## Suggested next milestones

1. Add player media with image safety, cropping and contrast controls.
2. Add a small rules-reference drawer for common Commander thresholds.
3. Add installable PWA support and offline assets.
4. Add optional match history only after its privacy and deletion UX are defined.

This is an independent fan project scaffold. Magic: The Gathering and Commander are trademarks of Wizards of the Coast; no card art or trademark assets are bundled.

