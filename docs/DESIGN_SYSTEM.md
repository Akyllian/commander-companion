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

## Compact density components (D-020; renamed by D-034) — structure final, visuals pending art direction

| Component | Class / hook | Notes |
| --- | --- | --- |
| Compact shell | `.app-shell[data-compact-density='true']` | 52px header, footer hidden, safe-area padding |
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

## Direct scoring dock (D-033) — removed by R2 (D-039); kept for history

- **Structure:** every panel has one `Punteggio di <nome>` group: modes `Vita`, `Commander`, `Veleno`, `Energia`, `Esperienza`, `Radiazioni`, `Tassa`, a gold divider, then `Monarca` and `Iniziativa`. Each is a real button with `aria-pressed`. Commander and Partner tax add a source row; the adjustment bar sits below.
- **Material:** one continuous strip on ink at 82% with gold hairline separators (`.score-modes`). Active mode: teal-tinted ink, ivory text, teal icon and a 2px gold underline, so the state reads by shape too. A held role fills its icon at 35% gold and keeps the underline.
- **Hierarchy:** life keeps its size and stays visible in every mode. Dock values are display serif at 2.25rem standard and 1.6rem compact, at most 60% of life. Mana uses the existing `.mana-cost` token in the utility face with lining figures.
- **Sizes:** modes, sources and steppers are ≥ 44×44 px. The standard adjustment bar has the life row's 3.25rem height. In compact, the strip shares the identity row as icons with accessible names, and the name keeps at least 7.5rem.
- **Overflow:** only the strip and the source row scroll sideways. A partial last item signals more content, and scrollbars are hidden. The page never scrolls horizontally. In compact, Commander/Tax add one row, so 844×390 may scroll vertically when both grid rows use those modes.
- **Motion:** `--duration-mode` is 120 ms. A new mode fades the value and settles it 2px; a new source only fades it. Role transfer fades the icon in over 140 ms. No layout motion. The global reduced-motion rule makes all of these immediate.
- **Manual check:** 320×568, 390×844, 768, 1440, 844×390, 844×330 and ≈200% zoom (640×400), with no art, bright art, Partner art and long names. Verified in the browser for this PR: no page-level horizontal scroll and no dock button under 44px.

## Four-player layouts (D-034) — implemented, awaiting design review

- **Access:** `Layout` (`.layout-button`, four-square icon, name `Layout dei quattro giocatori`) appears only with four players: after `Regole`, before `Preferenze` (standard) or `Partita` (compact). Below 52rem and in compact density the label hides and the icon stays.
- **Selector:** `ModalSideSheet` titled `Layout dei giocatori`. It holds a `radiogroup` of three `.layout-option` buttons (`role="radio"`, `aria-checked`, ≥ 88px; 111px measured). Each shows a schematic SVG board, the name in Cormorant, a UI-face description and the text `Selezionato` on the current option. Two columns only when the sheet body itself is at least 40rem wide (container query); the 28rem sheet is always one column (ChatGPT review: viewport columns squeezed options to ~201px at 768/1024). Keyboard: roving tabindex, so the group is one Tab stop. Arrows, Home and End move focus and wrap; Space or Enter chooses. Arrows never apply a layout, because a choice closes the sheet.
- **Material:** teal-depth table (`--color-depth`) with a gold hairline, ink seats with gold lines, and the player tint only on the short orientation mark. Selected: brighter gold border, 9% teal fill, inset gold line, plus the `Selezionato` pill. No neon green, photos or light shadows.
- **Seats:** every cell is `.player-seat[data-seat][data-orientation] > .player-seat__content`, always rendered, so a layout change never remounts a panel. Grid seats are `top-start…bottom-end`; Tavolo seats are `bottom`, `left`, `top`, `right`. Orientations: grid `0,0,0,0`; facing `180,180,0,0`; Tavolo `0,90,180,−90`. DOM and tab order stay 1→4. `main[data-layout]` carries the effective layout. Below four cells it is `grid`; a removed player's Undo bar counts as the fourth cell and keeps that seat.
- **Tavolo geometry:** areas `top top top / left centre right / bottom bottom bottom`. Columns `minmax(8.5rem,1fr) minmax(0,1.2fr) minmax(8.5rem,1fr)`, middle row `clamp(18rem, 50dvh, 40rem)` (the compact rail needs ~272px). Side seats are size containers, and their content is `100cqh × 100cqw`, centred and turned ±90°, so geometry is reserved rather than overflowing. Tavolo always uses compact panels; the centre stays empty. Short screens scroll rather than fall back to the grid.
- **Overlays:** Dettagli, Regole, Partita, Preferenze and Layout use the top layer or a portal and stay upright. Focus returns to the turned opener (checked from a 90° seat).
- **Motion:** a layout change runs one 140 ms Web Animations crossfade with a 2px settle on `main` (no remount, no animated rotation), skipped under reduced motion.
- **Verified in the browser for this PR:** Tavolo at 768×1024 and 390×844; Fronte a fronte at 844×390; Griglia at 1440. No page-level horizontal scroll and no target under 44px.

## Two-player layouts (D-035) — implemented, awaiting design review

- **Access:** the same `Layout` trigger appears with two players, named `Layout dei due giocatori`. The sheet shows `Stesso lato` (`Tutti e due verso di te`) and `Fronte a fronte` (`Uno per lato`), with the same option, preview and keyboard pattern as D-034.
- **Geometry (updated by R1 §13.3):** `two-facing` reuses the Stesso lato seats, sizes and density at every breakpoint; only player 2's content turns 180°. The previews share one silhouette.
- **Preference:** `twoPlayerLayout`, stored apart from `fourPlayerLayout`.

## Cumulative delta (D-036) — implemented, awaiting design review

- **Lifecycle:** one `.delta-badge` per tap burst (`DeltaSlot`, keyed by the history group). It enters once (`--duration-delta-in` 90 ms, opacity and 2px). Later taps change only its number. It stays 700 ms after the last tap, then `data-phase="exit"` fades it over `--duration-delta-out` 160 ms. Reduced motion makes both immediate.
- **Placement:** overlays the value and never reflows:
  - standard life: right of the number, 1.05rem;
  - compact rail: above the number's top-right corner, 0.9rem;
  - dock value: right of the number, 0.85rem.
- **Commander damage:** the dock badge on the Commander value and a mirrored badge on life, both from the same burst.
- **Speech:** badges are `aria-hidden` and dock outputs are `aria-live="off"`. Each panel has exactly one polite `.score-announcement` region (`useScoreAnnouncement`):
  - it speaks once per settled burst, keyed by the history group, never for a mode or source change;
  - Commander damage says damage and life together;
  - life changes outside a burst (Undo, Redo, reset, another tab) are spoken once they settle.

## App shell (R1, D-038) — implemented, awaiting design review

- **Sections:** `src/shell/sections.ts` defines the order Partita, Mazzi, Impara, Altro and the address `#mazzi|#impara|#altro` (no hash means Partita). `useSection` follows Back and Forward.
- **Bar:** `.section-nav[data-state]`:
  - `persistent`: sticky ink band with a gold hairline;
  - `revealed`: fixed over the game, entering in `--duration-nav-in` 180 ms (−8px→0) and leaving in `--duration-nav-out` 140 ms;
  - `hidden`: `hidden` plus `inert`.
  Items are at least 48px, labels 0.72rem (0.68 compact) uppercase with tracking 0.08em. The active item gets gold and a 2px line that lights in place.
- **Rhombus:** `.shell-rhombus` is a square 56px button containing an SVG diamond (ink, gold line, inner hairline) and a teal sigil that turns gold when expanded. Press: 1px over 90ms. Until the first use, the coach label «Tocca ◇ per le sezioni» sits above it (see Coach label below).
- **Portrait column (§13.1):** when the 64px zone around the table centre is not on the first screen, the rhombus uses the first inner seam that is fully visible. Measured in document coordinates, it never follows scroll.
- **Coach label (§13.2):** `.shell-rhombus__hint` reads «Tocca ◇ per le sezioni», sits above the rhombus, is at most 9rem, `aria-hidden` and `pointer-events: none`. Each card it would cover gets `data-hint-side` and `--hint-reserve` (from `hintReserve` in `centre.ts`) and keeps that band free until the first rhombus press.
- **Free zone:** `useCentreLayout` measures the grid and seats. `.player-seat[data-clear]` pads the card on the touching side or corner (`--centre-clear: 1.75rem`), in the card's own frame.
- **Altro:** `.screen` is a 46rem column. `.settings-group` titles are gold uppercase 0.75rem; `.settings-row` rows are at least 52px. The reset sits in its own group 24px below a hairline. Also `.settings-switch`, `.segmented` and `.primary-button`.
- **Placeholders:** `.placeholder-screen` with a 3rem line icon (teal for Mazzi, gold for Impara) and a serif heading. Mazzi has a `In preparazione` pill; Impara has the `.rules-bridge` button.
- **Notices:** `.app-notices[data-placement]`, `inline` under the bar outside the game, `toast` fixed above the bottom safe area during play.

## Match screen (R2, D-039) — implemented, awaiting design review

- **Card (`.player-panel`):**
  - header grid `2.75rem | 1fr | 2.75rem`: `.monarch-button` (filled crown and gold line when held), identity (`.player-name` display serif uppercase 1.2rem, `.player-commander` 0.8rem), `.details-button` (⋮);
  - `.life-zone` `− total +`, buttons 44px;
  - footer: `.counters-trigger` (gold-line rectangle, icon and label, icon-only when compact) and `.commander-trigger` (44px square hit area with a 45° diamond drawn in `::before`);
  - `.art-credit` on standard cards only.
- **Compact density:** two rows, `head` and `counters life commander`.
- **States:** `data-art="commander|random|neutral"`. `data-out` desaturates the art and shows `.out-line` «Fuori dalla partita» (on compact cards it takes the commander line's place).
- **Inner surfaces (`.card-surface`):**
  - opaque ink with a gold top hairline, `inset: 0`, enter 180ms (`--duration-surface-in`, opacity and 10px);
  - exit 140ms (`--duration-surface-out`) as `[data-closing]`: opacity only, already `inert`, `aria-hidden` and without pointer events; immediate with reduced motion;
  - focus rings are inset (`outline-offset: -2px`), so they never cross the clip.
  - **Contatori:** `.counter-column` rows `44px | 1fr | 44px` with a gold hairline border.
  - **Danni Commander:** `.commander-source` radios, chosen with a gold border, check icon and «Selezionato», then a horizontal 44px stepper.
- **Compact surfaces (`[data-short]`, card under 200px, normative since D-039):**
  - row layout with a 56px name and life rail;
  - columns exactly 44 + 35 + 44 = 123px, at least 56px wide, abbreviations VEL ENE ESP RAD C1 C2 MON INI;
  - opacity-only entry over 140ms.
- **Rhombus hub:**
  - `.hub-dismiss` is a transparent full-viewport layer (z 6) that closes on click and consumes it; `.rhombus-hub` is z 7 and the rhombus z 8;
  - `.rhombus-hub__action` buttons are 56px ink tiles with a gold line, an icon and a 0.6rem uppercase label;
  - radial at ±86px, entering from 8px toward the centre;
  - the 2×2 fallback uses 64×56 cells, a 6px gap and a 16px hairline to the rhombus.
- **Tools (`.hub-tool`):**
  - ink panel with a gold line and a 140ms crossfade; `.hub-tool__tether` is the hairline to the rhombus when the panel had to move;
  - `.tool-button` buttons are at least 56px;
  - `.oriented-result` places copies on a 3×3 grid (0° bottom, 180° top, 90° left, −90° right); results enter over 160ms (dice) or 220ms (coin) as a fade with the gold hairline lighting;
  - panels sit beside the rhombus (`placeToolPanel`: below, above, after, before), never over it; a panel too tall for every side opens beside it at the full safe height and scrolls inside;
  - side result copies (90°, −90°) use `writing-mode: vertical-rl`, so they take their turned size;
  - Mana is a 3×2 `.mana-column` grid by default and under 360px, and one row of six (4px gaps) from 832px.
- **Mana symbols (F34 exception, the only coloured pictograms):**
  - `.mana-symbol[data-mana]` is a 22px line drawing: sun, drop, skull, flame, tree and diamond;
  - each takes its colour from `--mana-w|u|b|r|g|c` (OKLCH, ≥ 3:1 on both ink tones, tested); the black is ash-violet;
  - the symbols are decorative; the steppers carry the Italian names.
- **First-use hint:** while a surface is open, `.shell-rhombus__hint[data-dimmed]` is `visibility: hidden` but stays laid out. The card reserve holds through the first hub session and is released on close.
- **Compact life:** `min(6rem, 22dvh)`, so 844×330 shows two rows without vertical scroll.
- **Tokens:** `--mana-w|u|b|r|g|c`, `--duration-surface-in` 180, `--duration-surface-out` 140, `--duration-tool-swap` 140, `--duration-dice` 160, `--duration-coin` 220, `--duration-art-fade` 140. The global reduced-motion rule makes them immediate.

## Mazzi (R3, D-040) — implemented, awaiting design review

- **Library:**
  - `.deck-row` is one link per deck: a 64px `.card-crop` (Partner split on the D-031 diagonal), serif name, commander, owner as text, offline state as icon plus text, and up to three category counts;
  - rows are at least 88px (`--deck-row-min-height`) and separated by gold hairlines at 35%;
  - the search appears from seven decks;
  - the empty state follows §4.3.
- **Neutral texture:** `.card-crop[data-empty]` is two soft arcane and gold glows on raised ink. It is used whenever a crop is not cached, never replaced by a random illustration.
- **Import:**
  - one page with a text step indicator (`.deck-import__step`, gold uppercase) and steps entering over `--duration-deck-step` (180ms, ≤ 6px translateX);
  - ambiguous lines have a gold border, missing ones a red border, and the text always says why;
  - result rows (`.card-result`) are at least 64px, with a 48px crop, name and artist.
- **Detail:**
  - `.deck-hero` is 168px on phones, 220px from 48rem and 128px in landscape up to 26rem; it uses the D-031 veil and a text halo;
  - `.deck-tabs` is a real tablist, with gold text and a 2px line;
  - category rows show a serif count and a 2px bar (arcane; muted for «Non classificate»), with no percentages;
  - in Lista, group titles stick inside the page scroll only.
- **Hand:**
  - `.hand-card` uses `--hand-crop-width` and is 156–176px tall: crop, then an opaque name band, never frame elements;
  - selection is a 2px gold border plus a numbered check;
  - the rail is full-bleed with 4px gaps; cards deal in over `--duration-hand-deal` 160ms with a 20ms stagger.
- **Check rows:** `.check-option` makes the whole label row a 44px target.
- **Action menu:** `.anchored-menu` lives in a portal on `<body>`, 224px wide, raised ink with a gold line, 44px items; it hangs below its trigger, right-aligned, and shifts or flips to stay 8px inside the viewport.
- **Form fields:** every text input, textarea and select reads the `--field-*` tokens (zero-specificity rule, so components can still size them):
  - ink-raised well, opaque gold-700 edge (3.15:1 on the field, 3.38:1 on ink), ivory text and muted placeholder;
  - hover brightens the edge to gold, focus to bright gold plus the global focus ring;
  - an error is `aria-invalid="true"` with a 2px danger edge and a described message, never colour alone;
  - disabled uses a hairline edge, ink background and muted text.
- **Hand exit:** Mulligan and Nuova prova fade the old hand out over `--duration-hand-out` (120ms, opacity only) before dealing; immediate with reduced motion.

