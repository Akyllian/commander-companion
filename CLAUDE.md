# CLAUDE.md

## Mission

Continue Commander Companion as a calm, accessible scoring tool for in-person Commander games. Preserve the “arcane, luminous and animated” direction without making standard controls unfamiliar.

## Read first

1. `PRODUCT.md`
2. `DESIGN.md`
3. `docs/superpowers/specs/2026-10-16-commander-companion-mvp-design.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DESIGN_SYSTEM.md`

## Commands

```bash
npm install
npm run dev
npm test
npm run build
```

## Engineering rules

- Put scoring behavior in `src/game/game.ts`, not in components.
- Add or change reducer behavior test-first in `src/game/game.test.ts`.
- Treat local-storage payloads as unknown input and validate them.
- Keep `GameAction` a discriminated union.
- Preserve 2–4 player bounds, 40 starting life, 10 poison and 21 Commander-damage rules.
- Life can be negative; counters cannot.
- Do not introduce a state library until React state demonstrably stops fitting.
- Do not add network calls to the reducer or UI components.

## Design rules

- Use the primitive → semantic → component token layers in `src/styles/tokens.css`.
- Use OKLCH for new colors and verify contrast.
- Keep touch targets at least 44px.
- Add a visible focus state and accessible name for every new control.
- Never rely on color alone; pair state color with text or a symbol.
- Every animation needs a reduced-motion behavior.
- Avoid gradient text, parchment backgrounds, ornate fonts in controls, decorative glass cards and gesture-only actions.

## Definition of done

- The full test suite passes.
- `npm run build` passes with strict TypeScript.
- The change works at 320px, 768px and 1440px widths.
- Keyboard-only and reduced-motion use remain viable.
- Documentation changes when behavior, schema or design tokens change.

