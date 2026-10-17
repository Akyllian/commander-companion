# Commander Companion Design System

## Theme

A near-black tabletop illuminated by a controlled teal spell-circle and small gold mana signals. The app is dark because it is used around a physical game table where glare competes with cards; the surface stays neutral so the colored light retains meaning.

## Color

All implementation colors live in `src/styles/tokens.css` as OKLCH custom properties.

- Background: neutral near-black, chroma 0.
- Primary: `oklch(0.720 0.100 188)` verdigris teal.
- Accent: `oklch(0.760 0.140 85)` mana gold.
- Player identity: teal, gold, violet and ember.
- Danger: red is reserved for defeat and destructive feedback.

Color strategy is restrained in controls and committed in state feedback. Never use player color as the only indicator of status.

## Typography

Use the system sans stack for quick loading and familiar controls. Life totals use the same family with tabular numerals, high weight and tight but safe tracking. No display font appears in labels, inputs or buttons.

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

The panel sigil rotates slowly as ambient state. Buttons use a 140ms state transition. Motion conveys tactility and atmosphere but never gates visibility. `prefers-reduced-motion` reduces all movement to effectively instant state changes.

