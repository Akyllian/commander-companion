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
| Undo bar | `.undo-bar` | inline in the removed panel's grid cell, 6 s, dashed border (D-015) |
| Delta badge | `.delta-badge` | `+N`/`−N`, `aria-hidden`, 140 ms fade (instant with reduced motion) |
| Defeat line | `.defeat-line .status-badge` | "Sconfitto · motivo" on its own line under the name |
| Partner label | `.partner-badge` | text label, not color-only |
| Deck configuration | `.deck-config` | disclosure under the name |
| Preferences menu | `.preferences-button`, `.preferences-panel` | gear button after "Azzera punteggi", native popover; hidden when Wake Lock is unsupported (D-015) |
| Option row | `.check-option` | checkbox + label, whole row ≥ 44px |

New semantic tokens: `--color-scrim` (dialog backdrop); `--color-danger-hover`, `--color-danger-active`, `--color-on-danger` (filled destructive button, dialog only); `--color-danger-foreground` (red icons/text on dark surfaces, 5.6:1).

| Component | Default | Hover | Focus | Active |
| --- | --- | --- | --- | --- |
| Destructive confirm | filled `--color-danger` | `--color-danger-hover` | gold ring | `--color-danger-active` |
| Remove player | muted icon | `--color-danger-foreground` | gold ring + red icon | red icon |

## Compact landscape components (D-020) — structure final, visuals pending art direction

| Component | Class / hook | Notes |
| --- | --- | --- |
| Compact shell | `.app-shell[data-compact-landscape='true']` | 52px header, footer hidden, safe-area padding |
| Score rail | `.score-rail` | `[−5] [−1] LIFE [+1] [+5]`, max 24rem, life `clamp(1.5rem, 9cqi, 2.25rem)` |
| Details button | `.details-button` | ⋯ icon, 44px, `Dettagli di <nome>` |
| Side sheet | `.side-sheet`, `__header`, `__body` | 8px inset, 28rem max, inner scroll |
| Popover menu | `.popover-menu`, `.popover-panel` | Preferenze, Partita, Stato app |
| Status button | `.status-button`, `__marker` | "!" marker + text, count in the description |
