# Commander Companion MVP — Product & UI Design

## Intent

Commander Companion is a responsive tabletop companion for new and returning Magic: The Gathering Commander players. It keeps the table focused on the game by putting life, poison, Commander damage and a few shared match controls in one readable surface.

The product should feel like an illuminated arcane instrument: luminous, calm and alive, without obscuring ordinary controls or slowing down score keeping.

## Goals

- Support two to four players on phone, tablet and desktop browsers.
- Make life changes fast with large, reachable `−1`, `−5`, `+1` and `+5` controls.
- Track poison and incoming Commander damage per opponent.
- Preserve the active game in local storage.
- Offer undo, redo and a deliberate new-game reset.
- Provide an accessible fantasy visual system with reduced-motion support.
- Give Claude Code enough context to continue implementation safely.

## Non-goals

- Rules adjudication or Gatherer/Scryfall card search.
- Accounts, cloud sync, multiplayer networking or authentication.
- Deck management, tournament pairing or match history.
- Personal photo/GIF upload in the first scaffold; the architecture reserves player accents and future media slots.

## Users and primary flow

The primary user is a beginner hosting an in-person Commander game. They choose the table size, rename players if needed, then hand the device around or leave it visible in the center. During play, anyone can adjust a player's life, poison, or incoming Commander damage. The latest state returns after a refresh.

## Functional model

- A match has 2–4 players and starts at 40 life.
- Life may go below zero because game state can continue briefly while triggers resolve.
- Poison cannot go below zero; ten poison is surfaced as a loss condition.
- Commander damage is tracked by source player and cannot go below zero; 21 from one source is surfaced as a loss condition.
- Undo/redo stores bounded snapshots of gameplay state.
- Reset restores current players to 40 life and clears counters while preserving names and accents.

## Interaction design

- Player panels are the dominant objects and use a responsive 1×N / 2×2 layout.
- Life controls stay visible; secondary counters sit in a compact expandable details region.
- Buttons use familiar symbols plus accessible names; no gesture-only actions.
- Destructive reset requires confirmation.
- Keyboard focus is always visible.

## Visual direction

Physical scene: a Commander pod gathered around a dark table, lit by a quiet teal spell-circle and small gold mana sparks, with enough ambient light that labels remain immediately readable.

Color strategy is restrained-to-committed: near-black neutral surfaces, teal as the interactive/system accent, gold for status and emphasis, and player colors limited to identifying edges and sigils. The interface avoids ornate display type for controls, gradient text, glass-card repetition and decorative motion.

## Accessibility

- Target WCAG 2.2 AA contrast and focus behavior.
- Minimum 44×44 CSS-pixel hit areas for scoring controls.
- Status must never rely on color alone.
- `prefers-reduced-motion: reduce` removes orbit, shimmer and transition movement.
- Semantic headings, regions, field labels and live score announcements.

## Technical constraints

- React 19, TypeScript 7 and Vite 8.
- No runtime UI framework or icon package.
- Pure reducer functions own match state transitions.
- Browser persistence is isolated behind a small storage module.
- Vitest + Testing Library cover domain rules and the main interaction path.

## Builder calls

- Responsive web is the delivery platform implied by “both” devices in the original brief.
- UI copy is Italian to match the product conversation; code and developer documentation remain English-first where conventional.
- Starter ships with four players by default, while the new-game control can choose 2–4.

