# Commander Companion Design System

## Canonical visual reference

The user-approved art direction is locked in [`docs/art-direction/CANONICAL_ART_DIRECTION.md`](docs/art-direction/CANONICAL_ART_DIRECTION.md). It takes precedence for atmosphere, typography, imagery, ornament and perceived production value. This document supplies implementation constraints where it does not conflict with that reference.

## Theme

A premium dark-fantasy editorial world: ink-black and deep blue-green surfaces, warm antique gold, luminous teal, cinematic illustration and fine arcane linework. The app remains dark because it is used around a physical game table where glare competes with cards, but it must not collapse into a generic dark product UI.

## Color

All implementation colors live in `src/styles/tokens.css` as OKLCH custom properties.

- Background: neutral near-black, chroma 0.
- Primary: `oklch(0.720 0.100 188)` verdigris teal.
- Accent: `oklch(0.760 0.140 85)` mana gold.
- Player identity: teal, gold, violet and ember.
- Danger: red is reserved for defeat and destructive feedback.

Color strategy is restrained in controls and committed in state feedback. Never use player color as the only indicator of status.

## Typography

Use an elegant high-contrast display serif for the brand, major headings, player names where space permits, life totals and editorial numerals. Use a highly legible utility face for compact controls, inputs, references and long copy. Scores and counters retain tabular numerals, high weight and safe tracking. The display serif is a required identity signal, not optional decoration.

## Layout

- Desktop/tablet: two-column player grid; two players may fill the available height.
- Phone: one-column scroll with sticky-free controls to avoid hiding player names.
- Spacing follows the 4px primitive scale.
- Hit targets are at least 44px.

## Components

- `PlayerPanel`: identity, status, life total, life controls and expandable counters.
- `TableControls`: history, player count, new game and reset.
- `Stepper`: conventional minus/value/plus counter control.
- `StatusBadge`: explicit defeat label with danger color.

Every interactive element has hover, focus, active and disabled treatment. Loading and remote-error states are intentionally absent because the MVP has no network operations.

## Motion

Motion feels like controlled arcane illumination: slow low-contrast sigil/linework movement, brief gold or teal ignition for meaningful selected states, and fast local score feedback. Buttons use a 140ms state transition; sheets use the approved 140–220ms directional transitions. Motion never gates visibility. `prefers-reduced-motion` reduces all movement to effectively instant state changes.
