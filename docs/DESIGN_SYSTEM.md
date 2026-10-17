# Design System Reference

## Three token layers

1. Primitive tokens define raw OKLCH colors, spacing, radii and timing.
2. Semantic tokens assign product meaning such as background, text, primary, accent and danger.
3. Component tokens control panels, buttons and focus rings.

Components must consume semantic or component tokens. Add a primitive only when no existing step fits; add a semantic alias when a value gains product meaning.

## Component states

| Component | Default | Hover | Focus | Active | Disabled/error |
| --- | --- | --- | --- | --- | --- |
| Button | raised neutral | teal border | double gold ring | 1px press | reduced opacity |
| Life button | neutral/player tint | player-accent border | double gold ring | 1px press | n/a |
| Name input | transparent | raised surface | double gold ring | raised surface | n/a |
| Player panel | neutral with accent top | n/a | child focus | n/a | red defeat border + label |

## Accessibility checklist

- Keep controls ≥44×44 CSS pixels.
- Verify body text ≥4.5:1 and large text ≥3:1.
- Give icon-only buttons an accessible name.
- Announce life changes with the existing polite live region.
- Keep defeated text visible in addition to the red border.
- Test 320px, 768px and 1440px widths.
- Test keyboard-only flow and reduced motion.

## Content style

Use short Italian action labels and plain rule names. Avoid invented fantasy terms for standard controls: “Annulla” remains “Annulla,” while atmosphere comes from the brand and visual layer.


## Provisional components (Phase 1, pending UX review)

Functional placeholders built only from existing tokens; see `docs/UX_REVIEW_FASE_1.md`.

| Component | Class | Notes |
| --- | --- | --- |
| System notice | `.app-notice` (`data-tone="warning"`) | update, offline-ready, save-unavailable, recovered-save messages; container is a polite `role="status"` region |
| Partner toggle | `.check-option`, `.partner-hint` | native checkbox with `accent-color`; whole label is the ≥44px target |
| Commander damage hint | `.commander-damage__hint` | muted helper text |

Layout fixes applied under the existing rules: counter labels shrink (`min-width: 0`) so steppers never leave the panel; Commander-damage labels wrap instead of truncating; the remove button keeps its 44px width; the name field is 44px tall; controls use `touch-action: manipulation`.

## Components from the Phase 1 UX review (D-014)

| Component | Class | Notes |
| --- | --- | --- |
| Confirm dialog | `.confirm-dialog`, `::backdrop` uses `--color-scrim` | opaque surface, compact, focus starts on "Annulla" |
| Undo snackbar | `.undo-snackbar` | fixed bottom, 6 s, never steals focus |
| Delta badge | `.delta-badge` | `+N`/`−N`, `aria-hidden`, 140 ms fade (instant with reduced motion) |
| Defeat line | `.defeat-line .status-badge` | "Sconfitto · motivo" on its own line under the name |
| Partner label | `.partner-badge` | text label, not color-only |
| Deck configuration | `.deck-config` | disclosure under the name |
| Match preferences | `.match-preferences` | footer disclosure; hidden when Wake Lock is unsupported |
| Option row | `.check-option` | checkbox + label, whole row ≥ 44px |

New semantic token: `--color-scrim` (dialog backdrop).
