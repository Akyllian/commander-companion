# Commander Companion — Art direction and motion handoff

Status: ready for implementation review  
Date: 2026-10-18  
Applies to: Phase 1.6 compact landscape and Phase 2a quick rules reference  
Visual board: [`docs/art-direction/compact-landscape-and-rules.svg`](art-direction/compact-landscape-and-rules.svg)

## Scope

This document defines visual hierarchy, component appearance and motion. It does not define React architecture, reducer behavior, storage, game rules or test strategy. Interaction requirements remain in the two approved product specs:

- [`Compact landscape layout`](superpowers/specs/2026-10-18-compact-landscape-design.md)
- [`Quick rules reference`](superpowers/specs/2026-10-18-rules-reference-design.md)

If this document conflicts with either approved spec on behavior or content, the approved spec wins. For visual treatment and motion, this is the implementation handoff.

## North star

The physical scene is a shared phone on a card table in subdued ambient light. Players glance from cards to the screen for less than a second, often from an angle. The interface should feel like a precise enchanted instrument: near-black metal, restrained verdigris light and small gold signals. It must never resemble parchment, a card frame, a fantasy game launcher or a particle effect.

Three hierarchy rules govern every screen:

1. Life is the brightest and heaviest information.
2. Player identity is carried by name and a restrained accent edge, not a colored panel fill.
3. Secondary information recedes through scale and tone, never through low contrast or hidden gestures.

## Existing visual system to preserve

Use the existing tokens in `src/styles/tokens.css`. Do not introduce a parallel palette or spacing scale.

| Role | Existing token | Direction |
| --- | --- | --- |
| Canvas | `--color-background` | Neutral near-black; never blue-black or parchment-tinted |
| Panel | `--color-surface` | Primary scoring surface |
| Raised control/sheet | `--color-surface-raised` | Menus, buttons and secondary regions |
| Structural line | `--color-border` | Quiet borders and dividers |
| Primary interaction | `--color-primary` | Hover, selected and active interaction—not decoration |
| Focus | `--color-focus` | Gold double ring, always visible |
| Danger | `--color-danger*` | Defeat and point-of-no-return actions only |
| Player identity | existing four accents | One edge, small label detail or restrained glow |

The current system sans stack remains correct. Use tabular numerals for scores and counters. Do not add a fantasy display face.

## Compact landscape composition

### Viewport geometry

At 844×330, use the approved vertical budget exactly:

| Region | Visual target |
| --- | ---: |
| Safe outer inset | 8px |
| Header | 52px maximum |
| Header/grid gap | 8px |
| Grid row gap | 8px |
| Player row | approximately 123px |

At 844×390, preserve the same header and gaps. Give the extra height to the two grid rows as breathing room; do not enlarge controls or the header.

The compact canvas loses the standard radial background emphasis. Retain only a very low-chroma ambient lift behind the grid so four panels read as one instrument rather than four glowing cards.

### Header

- Surface: near-black at high opacity, one standard border, no glass blur.
- Shape: 12px radius in compact mode; the standard 18px radius remains elsewhere.
- Brand mark: 36×36px visual size inside a 44×44px non-interactive slot. Keep its teal line and gold center; reduce the glow to half the standard intensity.
- Undo/Redo: 44×44px icon buttons. Disabled controls remain visible but quiet; never collapse their space.
- `Stato app`: neutral button with a small static gold diamond or dot plus text/icon. No pulsing warning animation.
- `Regole`: book/reference icon with visible label when it fits. Icon-only is the last compression step, not the default.
- `Partita`: text label plus a small downward chevron. It is the strongest header control after history because it contains match management.
- Use a 4px gap between compact header controls. Reserve 8px before the `Regole`/`Partita` group when space allows.

No control uses filled teal. Teal appears in border/focus/selected states so the life values remain the brightest objects.

### Player panel

- Radius: 12px compact, existing radius elsewhere.
- Padding: 8px minimum; 10px is preferred at 390px height.
- Border: standard border on all sides plus the existing player-accent top edge. Do not thicken the accent edge.
- Shadow: reduce the standard panel shadow by roughly one third in compact mode; four heavy shadows make the grid look fragmented.
- Decorative sigil: hidden.
- Internal structure: two rows only—identity and life controls.

Identity row:

- Height: 44px.
- Name: 14px/18px, weight 700, one line, ellipsis. It remains an input visually but does not need a permanent filled field.
- Defeat badge: 11px/14px, weight 700, red fill, one line. Prefer `Sconfitto` visibly when width is scarce; keep complete reasons in accessible text.
- Details button: 44×44px, 20px icon, 1.75px rounded stroke. Use a horizontal three-dot/details glyph inside the existing button vocabulary, not a kebab menu suggesting generic overflow.

Life row:

- Visual sequence: `[−5] [−1] LIFE [+1] [+5]`.
- Buttons: exactly 44×44px at the constrained target; 4px gap.
- `−1` and `+1`: player-accent tint at the existing 20% mixture; these are the primary scoring actions.
- `−5` and `+5`: neutral raised surface; same type weight, lower chromatic emphasis.
- Life cell: minimum width 64px, centered; 40–48px type depending on available panel width, weight 720, line-height 0.9, tracking no tighter than −0.04em.
- Preserve equal life-cell width for `9`, `40`, `100` and negative values so buttons do not move between taps.
- Delta badge: absolute at the life cell’s upper-right, never part of row measurement.

The life total may use a soft player-accent text shadow, but its spread must remain inside the panel and never reduce digit edge clarity.

### Two and three players

Do not scale typography or controls up to consume empty space. The difference is spatial rhythm:

- two players: center the fixed-width life rail vertically and give it more surrounding air;
- three players, wide: equal columns with identical compact panels;
- three players, narrow: the spanning third panel keeps the same internal maximum widths and centers them—it must not become a different component.

### Inline Undo state

The Undo bar is a temporary panel replacement, not a toast.

- Use the same compact panel radius and footprint.
- Keep the dashed neutral border; do not introduce success green.
- Player name and `rimosso` are one concise line.
- `Annulla` is 44px high with teal text/border emphasis.
- Do not animate grid geometry when it appears or disappears.

## Menus, notices and sheets

### `Partita` and `Stato app` popovers

- Surface: `--color-surface-raised`, standard border, 12px radius, panel shadow.
- Width: content-led with a practical minimum of 16rem; never exceed the viewport inset.
- Padding: 8px around grouped controls, 12px for notice prose.
- Dividers separate destructive match management from the Wake Lock preference; do not wrap every row in a card.
- `Azzera punteggi` remains visually quiet in the menu. Danger red appears only inside its confirmation dialog.
- `Stato app` uses the same surface language. Warning identity comes from a gold marker and explicit text, not a yellow-filled panel.

### Shared side-sheet shell

Player details and rules use the same shell language:

- Opaque near-black surface; no glassmorphism.
- Standard border and panel shadow.
- Scrim: existing `--color-scrim`.
- Header: sticky, 52px minimum, one bottom divider, title left and 44×44px Close control right.
- Content scrolls beneath the header with 16px side padding and 20–24px section rhythm.
- Compact landscape: 8px outer inset, radius 12px, maximum width 28rem for player details.
- Rules: maximum width 36rem on standard layouts; same 8px inset in compact landscape.

The active game remains recognizable through the scrim but must not compete with sheet text. Do not add a bright teal sheet border: focus and the open state already communicate elevation.

### Player details art direction

Use dividers and vertical rhythm rather than nested cards.

- Defeat reason: red text badge on the first content line, never a large alert block.
- Section headings: 14px/18px, weight 700; normal title case, no tracked uppercase.
- Counter rows: current stepper vocabulary, aligned to a shared right edge.
- Deck configuration: normal disclosure row.
- Remove action: quiet danger text/icon at the end, separated by at least 24px and a divider. It becomes filled red only in the confirmation dialog.

## Rules reference art direction

The rules sheet is a compact reading surface, not a collection of feature cards.

### Typography

| Element | Size / line-height | Weight | Treatment |
| --- | --- | --- | --- |
| Sheet title | 18px / 24px | 720 | Primary text |
| Introduction | 15px / 22px | 450–500 | Primary text, max 65ch |
| Group heading | 15px / 20px | 700 | Primary text; 24px top rhythm |
| Rule title | 14px / 20px | 700 | Primary text |
| Rule body | 14px / 21px | 450 | Primary text, max 65ch |
| Rule reference | 12px / 18px | 500 | Muted after contrast verification |
| Effective date/footer | 12px / 18px | 500 | Muted, separated by a divider |

- Use 1px dividers between rules; do not put each rule in a card.
- Give R1–R7 a narrow, muted identifier column or inline prefix. It supports scanning but never becomes a decorative numbered badge.
- Thresholds use bold text only. No colored number chips.
- `{2}` is a 24px-high textual mana token: circular or softly rounded, gold outline, neutral fill, primary text. It reads as notation, not an icon illustration.
- `Non tracciata dall’app` is a neutral/gold-outline pill with explicit text. Never use danger red.

### Reading rhythm

Group headings anchor scanning. Within a group, keep 12px between title and body/reference cluster and 16px between adjacent rules. Use 24px before a new group. The sheet should look calm at the top and become no denser toward the bottom.

No tabs, sticky table of contents, decorative book texture or fantasy ornaments are added.

## Motion principles

Motion communicates state, locality and causality. It never introduces the page, celebrates routine taps or competes with live play.

Use only the existing timing system:

- fast: `--duration-fast` = 140ms;
- normal: `--duration-normal` = 220ms;
- easing: `--ease-out` = `cubic-bezier(0.22, 1, 0.36, 1)`.

Do not add bounce, spring, elastic easing or orchestrated staggering.

## Motion recipes

| Event | Duration | Property | Direction |
| --- | ---: | --- | --- |
| Button hover/focus/press | 140ms | background, border, `translateY(1px)` on press | Existing behavior; no scale |
| Life delta appears | 140ms | opacity 0→1, translateY(2px→0) | Local to changed value; no layout movement |
| Defeat badge appears | 140ms | opacity 0→1 | Border color may transition simultaneously; never pulse |
| `Partita` / `Stato app` opens | 140ms | opacity 0→1, translateY(−4px→0) | Surface stays readable if animation is skipped |
| Popover closes | 140ms maximum | opacity 1→0 | No delayed interaction lock |
| Side sheet opens | 220ms | opacity 0.92→1, translateX(12px→0); scrim opacity | Short arrival from the owning edge, not full-width travel |
| Side sheet closes | 140ms | opacity 1→0, translateX(0→8px); scrim opacity | Close is faster than open |
| Disclosure opens | 140ms | content opacity; optional 2px vertical settle | Do not animate height through a long accordion motion |
| Undo bar replaces panel | 140ms | opacity | Grid geometry changes immediately; no sliding panels |
| Orientation crosses compact threshold | 0ms | none | Layout switches immediately; do not animate reflow |
| Rules content | 0ms | none | No per-rule entrance or stagger |

Native popover/dialog lifecycle may constrain exit animation. Correct dismissal, focus restoration and input responsiveness take priority over playing the closing transition.

## Ambient motion

The standard player sigil may retain its existing 24-second linear rotation because it is low-contrast and conveys the enchanted-instrument atmosphere. It is hidden in compact landscape and stops under reduced motion. Do not add particles, shimmer, breathing glows or animated gradients.

## Reduced motion

Under `prefers-reduced-motion: reduce`:

- stop the sigil rotation;
- reduce all transitions and keyframes to the existing effectively-instant 0.01ms rule;
- never retain transforms while only removing opacity;
- keep every state visible through text, border and static color;
- do not delay focus changes to wait for animation completion.

Reduced motion is a state-equivalent presentation, not a visually degraded mode.

## Art-direction QA

Review these states at 844×330, 844×390, 320px portrait, 768px and 1440px:

- four players at 40 life;
- long player name plus defeat badge;
- life totals `−10`, `9`, `100`, `999`;
- active cumulative delta on each side of the life value;
- both system notices active;
- open `Partita` menu;
- open player-details sheet with the longest Commander labels;
- open rules sheet at the first and last group;
- player removed with focused Undo bar;
- keyboard focus on every compact header control;
- 200% zoom and reduced motion.

Reject the implementation if:

- player accent fills dominate an entire panel;
- compact controls shrink below 44px;
- a popover or sheet appears translucent enough for background text to interfere;
- the rules become a card grid;
- warning, capability limitation and destructive danger share the same red treatment;
- animation moves the grid, delays dismissal or hides content before JavaScript runs;
- compact mode feels like a miniature desktop layout rather than a score-first instrument.

## Art-direction calls made here

These are designer decisions within the approved builder-discretion boundary:

- compact radius is reduced to 12px to preserve usable interior space;
- compact gaps use the 4px spacing primitive where the standard UI uses 8px;
- standard panel shadow is visually reduced in the four-panel compact grid;
- `−1`/`+1` carry player tint while `−5`/`+5` remain neutral;
- sheets use a subtle 12px edge arrival instead of a full off-canvas slide;
- rules use dividers and typographic rhythm, with no per-rule entrance motion.
