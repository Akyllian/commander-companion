# Commander Companion — Canonical visual gap review

Status: ready for visual implementation  
Date: 2026-10-18  
Canonical source: [`art-direction/CANONICAL_ART_DIRECTION.md`](art-direction/CANONICAL_ART_DIRECTION.md)  
Translation board: [`art-direction/canonical-compact-and-rules.svg`](art-direction/canonical-compact-and-rules.svg)

## Scope

This review covers art direction and motion only. It does not request changes to scoring behavior, React architecture, persistence, rules copy or accessibility semantics.

## Current verdict

The current interface has become a strong functional skeleton. Compact geometry, 44px controls, responsive reflow, rules structure and transition timing are substantially correct.

Verified in the live implementation on 2026-10-18:

- the former 768px overflow is resolved (`clientWidth = scrollWidth = 768px`);
- compact header, player panels and sheets use the approved 12px radius;
- side-sheet transitions use the approved 220ms opening material and 140ms fast timing elsewhere;
- the rules sheet visibly renders R1–R7 and preserves one continuous reading surface;
- the 844×330 compact 2×2 composition still fits without page scrolling.

It is not yet the approved visual product. At 844×330 the live interface still reads as a clean generic dark scorekeeper: flat black panels, Inter everywhere, gray rounded controls and almost no authored world. The canonical reference requires a premium illustrated Commander companion with antique gold, luminous teal, serif display typography, fine arcane linework and cinematic depth.

The next pass must change the **visual material**, not the information architecture.

## Current → canonical

| Layer | Current implementation | Canonical target |
| --- | --- | --- |
| Typography | Inter for brand, names, life and rules | Display serif for brand, major headings, player identity and life; Inter only for utility and long copy |
| Canvas | Neutral black with extremely restrained ambient lift | Ink-black/deep teal world with atmospheric scenic depth and fine arcane geometry |
| Panels | Flat near-black rounded rectangles | Dark illustrated/atmospheric panels with contrast veil, fine gold frame and restrained player-color energy |
| Life | Large bold white sans | Warm ivory/gold high-contrast serif numerals, still the strongest datum |
| Controls | Standard gray bordered buttons | Familiar controls retained, but with gold/teal line vocabulary and fewer default-looking gray rectangles |
| Header | Utility toolbar with symbol mark | Compact instrument header with authored sigil, gold active cue and editorial labels |
| Rules | Clear black document sheet | Illustrated editorial reference with serif headings, gold numbering and teal/gold timeline cues |
| Motion | Correct opacity/translate transitions | Same timing plus subtle one-shot gold/teal ignition at meaningful state changes |

## Non-negotiable visual changes

### C1 — Establish the type pairing

Recommended pairing for implementation:

- display: `Cormorant Garamond`, with `Georgia` as a robust fallback;
- utility: the existing `Inter` stack.

Use the display face for:

- brand wordmark;
- life totals;
- player names when they are not being edited;
- sheet titles and rules group headings;
- prominent rule numerals and editorial labels.

Keep Inter for:

- buttons and compact action labels;
- inputs and editable names;
- body copy, references and accessibility-critical microcopy;
- dense counters and technical values.

Do not apply the serif indiscriminately to every UI label. The contrast between editorial identity and utility is the system.

### C2 — Replace flat black with controlled atmosphere

Introduce three visual layers without changing layout:

1. **Canvas layer:** deep blue-green radial/linear atmosphere, never a bright gradient.
2. **Arcane layer:** low-opacity geometric linework or constellation paths, clipped to canvas/panel boundaries.
3. **Content veil:** opaque-enough black/deep-teal overlay beneath all interactive content.

Until original player artwork is available, use authored abstract textures and linework rather than generic stock fantasy images. The panel API should remain ready for a future artwork slot, but no placeholder image is required in the MVP.

### C3 — Reframe player panels

- Fine antique-gold outer frame at low/medium contrast.
- Inner player-color energy line or glow, never a full colored fill.
- Optional corner/sigil detail on one or two corners only; avoid four-corner ornamental noise.
- Preserve 12px compact radius and the proven 123px row height.
- Life numeral becomes warm ivory with a restrained gold edge/glow.
- ±1 keeps the player-energy tint; ±5 stays materially quieter.
- The details affordance should feel like part of the same line-icon family, not a default ellipsis button dropped on top.

### C4 — Make the rules sheet editorial

Preserve the continuous document and internal scrolling. Add:

- a shallow scenic/arcane header band beneath the sticky title area;
- serif sheet and group headings;
- gold R1–R7 identifiers or gold numbered nodes;
- a fine teal/gold vertical guide for sequential rules where helpful;
- selective 16:9 scenic strips only at major group boundaries;
- utility-sans body copy on an opaque reading veil;
- thin gold/teal dividers instead of generic gray lines.

Artwork must never sit directly behind body copy. Do not turn individual rules into cards.

### C5 — Create an arcane icon vocabulary

Use a consistent 1.5–1.75px rounded stroke for utility icons, with three material states:

- inactive: muted ivory;
- available/hovered: antique gold;
- selected or magical state: luminous teal plus a restrained gold anchor.

The brand sigil may be more intricate than utility icons. Do not use emoji or mixed icon families.

## Motion layer

Keep the implemented 140ms/220ms timing model. Add only these canonical cues:

| Event | Canonical motion cue | Constraint |
| --- | --- | --- |
| Selected header action | Gold underline draws or brightens over 140ms | No perpetual glow |
| Life change | Existing 2px settle plus a 140ms local ivory/gold light bloom | Never scale the numeral |
| Player panel focus | Inner teal/player-color line brightens over 140ms | No moving border loop |
| Popover open | Existing −4px arrival plus a brief gold edge ignition | Surface remains opaque |
| Side-sheet open | Existing 12px arrival; header line illuminates once over 220ms | No full-screen sweep |
| Defeat | Existing badge fade plus one red-to-gold border handoff | No pulse or shake |
| Ambient standard layout | Very slow 24–30s sigil/line drift | Hidden in compact; stopped under reduced motion |

All content remains visible without animation. `prefers-reduced-motion: reduce` removes transforms, drawing and blooms while preserving final color, border and text states.

## What not to change

- Compact 2×2 composition and 52px header.
- 44px target sizes.
- Life-control order.
- Opaque side-sheet behavior and focus management.
- Rules content hierarchy and IDs.
- Immediate breakpoint reflow.
- Quiet use of player colors.

## Implementation sequence for Claude

1. Add the display-font token and apply the type roles without changing geometry.
2. Add canvas/panel atmosphere and gold framing using CSS layers or pseudo-elements.
3. Restyle icons and active states into the canonical gold/teal material vocabulary.
4. Apply the editorial rules treatment.
5. Add the canonical one-shot motion cues.
6. Re-run the existing compact, 768px, zoom and reduced-motion checks.

## Acceptance test

At a glance, a reviewer should be able to place the live 844×330 score screen beside the canonical reference and recognize the same product family without reading the logo. If the only similarities are “dark background” and “teal/gold accents,” the pass is incomplete.
