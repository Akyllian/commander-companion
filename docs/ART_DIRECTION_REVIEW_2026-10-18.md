# Commander Companion — Art direction implementation review

Method: dual-agent (A: `/root/visual_assessment_a` · B: `/root/visual_assessment_b`)

Status: implementation review, ready for visual refinement  
Date: 2026-10-18  
Scope: compact landscape, match popover, player-details sheet, rules sheet and motion  
Reference: [`ART_DIRECTION_AND_MOTION.md`](ART_DIRECTION_AND_MOTION.md)

> **Canonical visual correction:** the user-approved reference is now locked in [`art-direction/CANONICAL_ART_DIRECTION.md`](art-direction/CANONICAL_ART_DIRECTION.md). Its cinematic dark-fantasy, antique-gold, luminous-teal, illustrated and serif-led language supersedes any wording in this review that could be interpreted as favoring a generic minimal dark-product aesthetic.

The follow-up gap review and updated visual translation live in [`CANONICAL_VISUAL_GAP_REVIEW.md`](CANONICAL_VISUAL_GAP_REVIEW.md) and [`art-direction/canonical-compact-and-rules.svg`](art-direction/canonical-compact-and-rules.svg). Use those artifacts for the next visual pass.

This review concerns art direction, visual hierarchy and animation only. It does not request changes to React architecture, domain behavior, persistence, rules content or test strategy.

## Executive verdict

The compact scoring composition is successful and should be preserved. At 844×330 and 844×390 all four players, all life totals and all scoring controls fit without page scroll; the 44px targets remain intact. The near-black instrument language, restrained player accents and opaque side sheets are aligned with the approved direction.

The implementation is not yet visually finished. One responsive defect appears at 768px, and the approved compact depth, rules typography and motion recipes have not been fully applied. These are bounded refinements, not a redesign.

## Scorecard

| Nielsen heuristic | Score | Art-direction evidence |
| --- | ---: | --- |
| Visibility of system status | 3/4 | Life, delta, defeat and Undo are clear; state changes are visually abrupt without the specified motion. |
| Match with the real world | 4/4 | Commander terminology and the `−5 −1 LIFE +1 +5` sequence are immediately understandable. |
| User control and freedom | 4/4 | Undo/Redo, dismissible sheets and recoverable removal are visible and consistent. |
| Consistency and standards | 3/4 | Shared sheets/popovers are coherent; the 768px header breaks the otherwise consistent responsive system. |
| Error prevention | 3/4 | Confirmation patterns are present; quiet destructive actions currently resemble disabled controls. |
| Recognition rather than recall | 3/4 | `Regole` and `Partita` are explicit; the player `…` affordance does not explain its richer contents. |
| Flexibility and efficiency | 3/4 | ±1/±5 and history controls support repeated table use well. |
| Aesthetic and minimalist design | 2/4 | The composition is focused, but compact radius/depth and rules hierarchy still use provisional styling. |
| Error recovery | 3/4 | Undo placement is strong; high-risk rows need clearer active-versus-disabled semantics. |
| Help and documentation | 3/4 | The rules sheet is useful and structurally sound; R1–R7 and the promised editorial rhythm are missing. |
| **Total** | **31/40** | **Good foundation; one responsive fix and one visual/motion pass remain.** |

Deterministic component scan: **0 findings** in `src/App.tsx` and `src/components`. This confirms the markup avoids the detector’s known design anti-patterns; it does not validate CSS sizing, visual tokens or motion.

## Preserve exactly

- The 52px compact header and 8px outer/grid gaps.
- The two-column, two-row grid at 844×330 and 844×390.
- All 44×44px scoring and details targets.
- Life-first reading order and stable `[−5] [−1] LIFE [+1] [+5]` rail.
- Neutral ±5 controls and player-tinted ±1 controls.
- Hidden sigils in compact landscape.
- Opaque sheets, strong scrim and one continuous rules document rather than rule cards.
- Static status markers: no pulse, shimmer, particles or animated gradient.
- Instant responsive reflow and the existing reduced-motion equivalence.

## Required redlines

### P1 — Contain the 768px header

At a 768px viewport the document is 795px wide. `Preferenze` begins at approximately x=749 and ends at x=795, so part of the control is clipped outside the viewport.

Art-direction requirement:

- allow the match-control group to wrap or redistribute throughout the intermediate 46–62rem band;
- keep every control entirely inside the header;
- preserve 44px targets and visible labels before considering icon-only compression;
- verify `scrollWidth === clientWidth` at 768px.

This is the only release-priority visual defect found.

### P2 — Apply the compact shape and depth tokens

The compact layout currently inherits the 18px desktop radius and full panel shadow. This makes the four panels feel like compressed desktop cards instead of one tabletop instrument.

Apply in compact landscape:

- header and player panels: 12px radius;
- player-details and rules sheets: 12px radius;
- compact popovers: 12px radius;
- panel shadow: approximately one-third lower intensity/spread than the standard panel shadow;
- keep the existing border and player accent edge unchanged.

Do not change standard-layout radii.

### P2 — Reinforce the life hierarchy

At 844px the compact life value computes to about 34.6–36px, below the approved 40–48px range even though horizontal room is available.

Apply:

- life value: at least 40px at 844px width, up to 48px when the rail permits;
- life cell: stable minimum width of 64px;
- player name: 14px/18px, weight 700;
- preserve button positions for `−10`, `9`, `100` and `999`;
- re-check the proven 844×330 no-scroll fit after the type adjustment.

The life value must remain the brightest, heaviest element. Do not enlarge surrounding controls to match it.

### P2 — Finish the rules reading system

The sheet structure is correct, but the current typography is nearly flat: title, group headings, rule titles and body cluster around 15–16px. The typed R1–R7 identifiers are not rendered, and `{2}` is plain bold text.

Apply the approved hierarchy:

| Element | Target |
| --- | --- |
| Sheet title | 18px / 24px, weight 720 |
| Introduction | 15px / 22px, primary text |
| Group heading | 15px / 20px, weight 700, 24px top rhythm |
| Rule title | 14px / 20px, weight 700 |
| Rule body | 14px / 21px, weight 450, max 65ch |
| Reference/footer | 12px / 18px, muted after contrast verification |

Also:

- render R1–R7 as a narrow muted column or inline prefix, never as decorative badges;
- add a 1px divider between adjacent rules and before the footer;
- render `{2}` as a 24px textual mana token with neutral fill and gold outline;
- keep `Non tracciata dall’app` neutral/gold, never danger red;
- do not introduce a card per rule or a sticky table of contents; use restrained gold numbering, arcane linework and selective scenic illustration in the canonical visual language.

### P2 — Implement the approved motion recipes

Live computed styles report `animation-name: none`, `animation-duration: 0s` and no non-zero transition for the open side sheet and `Partita` popover. The current delta keyframe changes opacity only.

| Event | Required motion | Acceptance cue |
| --- | --- | --- |
| Life delta | 140ms, opacity 0→1 and `translateY(2px→0)` | Feels attached to the changed number; no layout movement. |
| Defeat badge/border | 140ms opacity/border transition | Appears once; never pulses. |
| Popover open | 140ms, opacity 0→1 and `translateY(−4px→0)` | Short local reveal from its trigger. |
| Popover close | ≤140ms opacity 1→0 | No delayed interaction lock. |
| Side-sheet open | 220ms, opacity .92→1 and `translateX(12px→0)` | Short arrival from the owning edge. |
| Side-sheet close | 140ms, opacity 1→0 and `translateX(0→8px)` | Exit is faster than arrival. |
| Scrim | Same open/close timing as its sheet | Never animates independently. |

Use only `--duration-fast`, `--duration-normal` and `--ease-out`. Do not animate grid geometry, sheet width, accordion height or responsive breakpoint changes. Native popover/dialog dismissal and focus restoration take priority over an exit animation.

Under `prefers-reduced-motion: reduce`, retain the existing effectively instant behavior and ensure no transform remains stranded when opacity animation is removed.

### P3 — Clarify quiet high-risk controls

`Azzera punteggi` and `Rimuovi giocatore` currently read closer to disabled controls than to available secondary actions.

Apply:

- `Partita`: add the small downward chevron to the trigger;
- add one divider between match management and Wake Lock;
- keep `Azzera punteggi` visually quiet but increase active text/border contrast;
- player details: place a divider and at least 24px rhythm before removal;
- use a restrained danger foreground for removal, reserving filled red for the confirmation dialog.

Do not turn either row into a red destructive button on the parent surface.

## Secondary observations

- The `…` details icon is visually tidy but semantically broad. Keep it for this pass; if first-use testing shows discoverability trouble, evaluate a dedicated details/sliders glyph before adding text to every panel.
- The sheet close `×` does not yet share the rounded-stroke vocabulary of the other icons. This is polish, not a blocker.
- The brand mark should remain a non-interactive slot in compact mode unless it has a real destination.
- Additional height at 844×390 is correctly used as breathing room; do not scale controls up vertically.

## Acceptance matrix

| State | Pass condition |
| --- | --- |
| 844×330, four players | Header, four panels and all life controls visible with no page scroll. |
| 844×390, four players | Same control sizes; extra height becomes panel breathing room. |
| 768px standard/intermediate | No clipped control and no horizontal page overflow. |
| 320px portrait | Header actions wrap without hiding primary scoring content. |
| 200% zoom proxy | No horizontal overflow; vertical reflow is allowed. |
| Life values | `−10`, `9`, `100`, `999` do not move the adjacent buttons. |
| Partita open | Chevron, divider, clear enabled reset row and 140ms local reveal. |
| Player details open | 12px compact radius, 220ms arrival, separated quiet-danger removal. |
| Rules open | R1–R7 visible, `{2}` tokenized, hierarchy and dividers readable. |
| Reduced motion | Same states and focus behavior with effectively instant transitions. |

## Emotional and persona check

The intended emotional arc is already present: calm entry, fast scoring, contained high-risk actions and reassuring rules consultation. The refinements above should strengthen it without adding spectacle.

- **First-use player:** life controls are immediate; `…` and quiet destructive rows remain the two discovery risks.
- **Keyboard/screen-reader/low-vision player:** focus rings and 44px targets are strong; the 768px clipping is the principal visual accessibility failure.
- **Stress tester:** the exact compact targets pass; token deviations and the unstyled mana notation are the clearest implementation mismatches.

## Final art-direction decision

Approve the current structure. Do not redesign the scoring surface. Resolve P1 first, then execute the P2 token/typography/motion pass as one coherent refinement. P3 can follow without blocking the compact layout milestone.
