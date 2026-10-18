# Commander Companion — Compact landscape layout

Status: approved by product owner on 2026-10-18  
Date: 2026-10-18  
Source brief: `docs/UX_BRIEF_ORIZZONTALE.md`

## Intent

Make a four-player game usable on a phone held horizontally without scrolling to find another player. The compact view is a score-first mode: all life totals and life controls stay visible, while infrequent match actions and secondary counters move into clearly labelled overlays.

Success means that at both 844×390 and 844×330:

- four active player panels are visible together;
- every interactive target remains at least 44×44 CSS pixels;
- the life total remains the strongest visual signal;
- Commander damage, counters, deck configuration and player removal remain discoverable without gestures;
- keyboard focus, screen-reader names and reduced-motion behavior remain valid.

## Goals

- Solve the real-device landscape failure recorded in the playtest.
- Preserve the existing scoring model, history, persistence and undo behavior.
- Keep frequent actions visible and move rare actions out of the constrained surface.
- Use the existing visual language: near-black surfaces, player accent edges, teal interaction, gold focus and red only for danger or defeat.
- Establish one overlay pattern that the rules reference can also follow.

## Non-goals

- No table-view rotation or opponent-facing panels.
- No domain, schema, persistence or game-rule changes.
- No gesture-only shortcuts.
- No redesign of portrait, desktop or ordinary tablet layouts.
- No new animation system.

## Activation

Activate compact mode when both conditions are true:

```text
orientation: landscape
max-height: 30rem
```

The rule responds to usable viewport height rather than device detection. It therefore covers the installed PWA and Safari with visible browser chrome. Rotating back or regaining more than 30rem of height restores the standard layout immediately without changing application state.

Use dynamic viewport units where they improve the available-height calculation, with a conventional viewport fallback. Compact mode must not require a minimum width: narrow landscape phones still need the score-first layout.

The no-scroll 2×2 requirement applies at the browser's default zoom for the two measured target viewports. When browser zoom, system text scaling or an unusually narrow CSS viewport makes the required 44px controls physically unable to fit, accessibility takes priority: controls never shrink below 44px and the player grid may reflow and scroll vertically. This is an intentional accessible fallback, not a failure of compact mode.

## Screen structure

At 844×330, the vertical budget is:

| Region | Target |
| --- | ---: |
| Outer padding | 8px top + 8px bottom |
| Compact header | 52px maximum |
| Header-to-grid gap | 8px |
| Player grid | remaining 254px |
| Grid row gap | 8px |
| Each row | approximately 123px |

The footer is hidden in compact mode. It contains no action needed during scoring. System notices use the compact notice behavior described below rather than consuming grid height.

### Four-player wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ ◉  ↶  ↷                          [Regole]*  [Partita]               │
├─────────────────────────────────┬────────────────────────────────────┤
│ Nome  [Sconfitto…]        [⋯]   │ Nome                         [⋯]   │
│ [−5] [−1]     40     [+1] [+5] │ [−5] [−1]     40     [+1] [+5]   │
├─────────────────────────────────┼────────────────────────────────────┤
│ Nome                      [⋯]   │ Nome                         [⋯]   │
│ [−5] [−1]     40     [+1] [+5] │ [−5] [−1]     40     [+1] [+5]   │
└─────────────────────────────────┴────────────────────────────────────┘

* “Regole” is added by Phase 2a; Phase 1.6 must leave room for it but must not
  render an inactive placeholder.
```

## Compact header

The header is one row and no taller than 52px.

Visible controls, in order:

1. brand mark only; hide the wordmark and subtitle;
2. Undo icon button;
3. Redo icon button;
4. conditional system-status button, only while one or more notices exist;
5. `Regole`, once Phase 2a exists;
6. `Partita`, a text-labelled menu button.

Undo and Redo remain visible because they affect rapid scoring. `Partita` groups infrequent match management and is not an unlabelled overflow icon.

### Partita menu

Use a native popover or equivalent top-layer non-modal surface. It contains:

1. `Giocatori` and the 2–4 player selector;
2. `Nuova partita`;
3. `Azzera punteggi`;
4. `Mantieni lo schermo acceso`, only when Wake Lock is supported.

The destructive actions keep their existing confirmation dialogs. Opening the menu moves focus into it; Esc and outside activation close it and return focus to `Partita`. The popover may scroll internally on exceptionally short viewports.

### Compact notices

Notices must not push the 2×2 grid below the fold. When notices exist, show a clearly named header button such as `Stato app`, with a non-color warning marker. Activating it opens a top-layer panel containing the same notice text and actions currently provided by `AppNotices`.

- A failed-save warning remains available until the condition clears.
- Recovery and update notices retain their current actions.
- The collapsed control must expose the number of active notices to assistive technology.

## Compact player panel

Each player panel contains exactly two layout rows plus padding.

### Identity row

- Editable player name, one line, shrinking and clipping horizontally rather than wrapping.
- Visible defeat badge when applicable.
- `Dettagli di <nome>` icon button, 44×44, using the existing icon stroke vocabulary.
- No remove button in the compact panel; removal moves to the details dialog.
- The `Partner` badge is omitted in compact mode and remains visible inside player details.

The details button must use a familiar “more/details” symbol and a complete accessible name. It is the only route to the secondary controls, so it cannot depend on a long press or swipe.

### Defeat state

Keep an inline text badge in the identity row:

- `Sconfitto · Vita`
- `Sconfitto · 10 veleno`
- `Sconfitto · 21 Commander`
- `Sconfitto · N condizioni`

At very narrow widths the visible badge may shorten to `Sconfitto`, but its accessible text must retain every reason. The red border remains supporting feedback, never the only feedback.

### Life row

Visual order:

```text
[−5] [−1]  LIFE  [+1] [+5]
```

- Buttons are 44×44 minimum.
- The life cell uses tabular numerals, a minimum width that prevents control movement between one-, two- and three-digit totals, and the strongest type weight in the panel.
- Hide the visible `Punti vita` label; keep it in the accessible name or description.
- Preserve the 700ms settled live-region announcement.
- The temporary cumulative delta is absolutely positioned relative to the life cell so it never changes row dimensions.
- Hide the decorative rotating sigil in compact mode; player identity remains in the accent border.

Keyboard focus follows the visible interaction order: name, details, −5, −1, +1, +5. The life value is not focusable.

## Player details dialog

`Dettagli di <nome>` opens a modal `<dialog>` presented as a right-side sheet in compact landscape.

Geometry:

- 8px outer inset;
- height no greater than `100dvh - 16px`;
- width up to 28rem, capped by the viewport;
- fixed header with player name and Close button;
- content scrolls inside the dialog, never behind it.

Content order:

1. visible defeat reason, when defeated;
2. Danni Commander, including `massimo N/21`;
3. Altri segnalini;
4. Configurazione mazzo and visible `Partner` state;
5. quiet danger action `Rimuovi giocatore`, only when removal is allowed.

Reuse the current disclosure behavior inside the dialog. Commander damage starts in the same open/closed state held for that player during the session. Closing and reopening the dialog must not reset scores or disclosure state.

The remove action closes the details dialog, removes the player immediately and places the existing Undo bar in that player's grid cell. Focus moves to the Undo bar as it does today.

## Undo after removal

The Undo bar remains inline in the removed player's grid position. In compact mode it fills the complete cell and contains:

- `<nome> rimosso`;
- a 44px `Annulla` button.

It keeps the current six-second duration, focus pause, latest-action guard and global Undo fallback. It must not change the dimensions or ordering of the remaining player cells.

## Player-count layouts

### Four players

Always a 2×2 grid.

### Three players

- At widths of at least 44rem: three equal columns in one row.
- Below 44rem: two columns; the third panel spans both columns on the second row.

The spanning panel keeps the same two-row internal composition rather than exposing extra secondary content.

### Two players

Two equal columns in one row, filling the available grid height. Controls do not grow beyond their standard target sizes; the additional space becomes breathing room around the life row.

## Motion

- No entrance choreography for compact mode.
- Existing 140ms button feedback remains.
- Dialog or popover appearance may use the existing fast duration for a subtle opacity/translation state change, but content is visible without animation.
- `prefers-reduced-motion: reduce` makes every reveal effectively instant.

## Accessibility and resilience

- Minimum target: 44×44 CSS pixels.
- All icon buttons need accessible names and visible focus.
- Focus is trapped in modal dialogs and restored to the opener on close.
- Popovers use light dismiss and return focus appropriately on keyboard dismissal.
- At 200% text zoom, overlays may scroll internally and the player grid may reflow into a vertically scrolling layout; controls must never overlap, clip or shrink below 44px.
- Safe-area insets must not cover header or bottom-row controls in the installed iOS PWA.
- Long names and large positive or negative life totals must not force horizontal page scrolling.
- The normal page must remain usable if `<dialog>` or Popover API behavior falls back to the project's existing compatibility patterns.

## Acceptance criteria

- At default browser zoom at 844×390 and 844×330, four players and all twenty life controls are visible without page scrolling.
- Header height is no more than 52px in compact mode.
- No compact player panel exceeds its grid row or produces horizontal scrolling.
- All secondary scoring and configuration actions are reachable through `Dettagli`.
- Player removal from the dialog produces the Undo bar in the correct cell.
- Two-, three- and four-player layouts match the rules above.
- System notices remain operable without changing grid height.
- Portrait, 768px and 1440px standard layouts remain visually unchanged except for any shared, approved component refinement.
- Keyboard-only, screen-reader and reduced-motion checks pass.
- At 200% zoom, the accessible reflow fallback preserves every action without horizontal page scrolling, even though all four panels are no longer required to remain simultaneously visible.

## Builder discretion

The builder may choose component boundaries, CSS class names and whether the common top-layer shell is factored immediately or after both Phase 1.6 and Phase 2a exist. That choice must not change the interaction, information hierarchy or focus behavior specified here.
