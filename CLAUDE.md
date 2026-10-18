# CLAUDE.md

## Mission

Continue Commander Companion as a calm, accessible scoring tool for in-person Commander games. Preserve the “arcane, luminous and animated” direction without making standard controls unfamiliar.

## Read first

1. `PRODUCT.md`
2. `DESIGN.md`
3. `docs/superpowers/specs/2026-10-16-commander-companion-mvp-design.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DESIGN_SYSTEM.md`
6. `docs/DECISIONS.md`
7. `docs/ROADMAP.md` — current phase, working rules and what waits on design

## Commands

```bash
npm install
npm run dev
npm test
npm run verify   # must pass before any commit
```

## Engineering rules

- Put scoring behavior in `src/game/game.ts`, not in components.
- Add or change reducer behavior test-first in `src/game/game.test.ts`.
- Treat local-storage payloads as unknown input and validate them.
- Keep `GameAction` a discriminated union.
- Preserve 2–4 player bounds, 40 starting life, 10 poison and 21 Commander-damage rules.
- Commander damage also changes life by the applied amount, and is tracked per commander (partner).
- Life can be negative; counters cannot. All values stay bounded safe integers.
- An action that changes nothing must return the same state reference.
- Schema changes bump `GAME_SCHEMA_VERSION` with a pure, tested migration.
- Keep `src/game/**` at 100% coverage.
- Record architectural decisions in `docs/DECISIONS.md`; UX, visual and motion decisions belong to the design owner.
- Do not introduce a state library until React state demonstrably stops fitting.
- Do not add network calls to the reducer or UI components.

## Design rules

- Visual identity follows the locked canonical reference `docs/art-direction/CANONICAL_ART_DIRECTION.md` (D-024): display serif (`--font-display`) for brand, life totals, resting player names and editorial headings; the utility face for controls, inputs, long copy and references.
- Atmosphere comes from authored CSS/SVG linework and gradients; never ship Wizards of the Coast card art or unlicensed images.
- Use the primitive → semantic → component token layers in `src/styles/tokens.css`.
- Use OKLCH for new colors and verify contrast.
- Keep touch targets at least 44px.
- Add a visible focus state and accessible name for every new control.
- Never rely on color alone; pair state color with text or a symbol.
- Every animation needs a reduced-motion behavior.
- Avoid gradient text, parchment backgrounds, display or ornate fonts in controls, decorative glass cards and gesture-only actions.

## Workflow

- One branch per phase, pushed with a pull request; merge only with green CI. Deployment to GitHub Pages follows automatically from `main`.
- UI work starts from a design brief and ends with a review summary for the design owner.

## Definition of done

- `npm run verify` passes.
- The change works at 320px, 768px and 1440px widths and at 844×390 landscape.
- Keyboard-only and reduced-motion use remain viable.
- Documentation changes when behavior, schema or design tokens change.

