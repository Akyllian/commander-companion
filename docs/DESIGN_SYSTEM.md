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

