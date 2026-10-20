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

## Rules reference (D-021) — structure final, visuals pending art direction

| Element | Class | Notes |
| --- | --- | --- |
| Trigger | `.rules-button` | book icon + "Regole", accessible name "Regole Commander" |
| Sheet | `.side-sheet.rules-sheet` | max 36rem, 65ch measure, one scroll region |
| Group / item | `.rules-group` (h3), `.rule-item` (h4) | dividers between groups, no cards |
| Reference | `.rule-reference` | muted text, always visible |
| Untracked status | `.rule-status` | text "Non tracciata dall'app", outlined, not red |
| Mana cost | `.mana-cost` | `{2}` text, spoken "due mana generici" |

## Canonical material (D-024)

| Role | Token | Use |
| --- | --- | --- |
| Ink | `--color-ink`, `--color-ink-raised` | canvas, panels, sheets, controls |
| Depth | `--color-depth` | rules band, atmospheric lift |
| Arcane teal | `--color-arcane` | selected state, guides, sigil ring |
| Antique gold | `--color-gold`, `--color-gold-bright` | headings, numbering, hover, ignition |
| Gold lines | `--color-gold-line`, `--color-gold-hairline` | frames, button borders, dividers |
| Ivory | `--color-ivory` | life totals, names, important reading text |
| Display serif | `--font-display` | brand, life, resting names, sheet/group headings, rule numbers |

Icon family: 24×24 viewBox, rounded 1.75px stroke, `currentColor` (muted ivory → gold on hover → teal when selected).

## Commander art (D-026–D-029) — C2.1 implemented; phone refinement approved

| Element | Class / hook | Notes |
| --- | --- | --- |
| Art layer | `.player-art`, `img` | `cover`, `--art-focus-x/y` (default 50% / 32%), decorative (`aria-hidden`) |
| Veil | `.player-art::after` | C2.1 base layers unchanged; life boost is an ink-tinted ellipse with ≤8px full-strength protection and ~56px continuous falloff; never a rectangular plateau |
| Small text protection | name, commander and credit lines over art | adaptive ink-colored glyph halo only when needed; 0 spread, 8–10px blur, 0–1px offset; never a visible outline or decorative glow |
| Panel with art | `.player-panel[data-has-art]` | ink base, sigil dimmed, frame and energy line kept |
| Commander line | `.commander-line`, `.commander-credit` | name + "Illustrazione di …", ivory (4.5:1 on art) |
| Picker disclosure | `.deck-config` | final label «Comandante e mazzo»; search/current commander before Partner toggle |
| Picker results | `.commander-results` | continuous list, max 5; 48×48 `art_crop`, name, visible credit; no nested scroll |
| Compact credit | `.player-details-sheet .commander-credit` | visible in Details/picker, intentionally absent from the 123px panel |
| Partner art | two art slots | static 50/50 split, Commander 1 left / Commander 2 right, subtle 48%→52% diagonal seam; never alternate |

## Direct scoring dock (D-033) — implemented, awaiting design review

- **Structure:** every panel has one `Punteggio di <nome>` group: modes `Vita`, `Commander`, `Veleno`, `Energia`, `Esperienza`, `Radiazioni`, `Tassa`, a gold divider, then `Monarca` and `Iniziativa`. Each is a real button with `aria-pressed`. Commander and Partner tax add a source row; the adjustment bar sits below.
- **Material:** one continuous strip on ink at 82% with gold hairline separators (`.score-modes`). Active mode: teal-tinted ink, ivory text, teal icon and a 2px gold underline, so the state reads by shape too. A held role fills its icon at 35% gold and keeps the underline.
- **Hierarchy:** life keeps its size and stays visible in every mode. Dock values are display serif at 2.25rem standard and 1.6rem compact, at most 60% of life. Mana uses the existing `.mana-cost` token in the utility face with lining figures.
- **Sizes:** modes, sources and steppers are ≥ 44×44 px. The standard adjustment bar has the life row's 3.25rem height. In compact, the strip shares the identity row as icons with accessible names, and the name keeps at least 7.5rem.
- **Overflow:** only the strip and the source row scroll sideways. A partial last item signals more content, and scrollbars are hidden. The page never scrolls horizontally. In compact, Commander/Tax add one row, so 844×390 may scroll vertically when both grid rows use those modes.
- **Motion:** `--duration-mode` is 120 ms. A new mode fades the value and settles it 2px; a new source only fades it. Role transfer fades the icon in over 140 ms. No layout motion. The global reduced-motion rule makes all of these immediate.
- **Manual check:** 320×568, 390×844, 768, 1440, 844×390, 844×330 and ≈200% zoom (640×400), with no art, bright art, Partner art and long names. Verified in the browser for this PR: no page-level horizontal scroll and no dock button under 44px.
