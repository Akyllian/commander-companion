# Commander Companion — Quick rules reference

Status: approved by product owner on 2026-10-18  
Date: 2026-10-18  
Source brief: `docs/UX_BRIEF_REGOLE.md`

## Intent

Give players a fast, offline explanation of the Commander rules that affect the numbers shown by the app. The reference supports a table discussion without replacing the official rules or turning Commander Companion into a rule engine.

Success means a new player can open the reference from the scoring screen, find the relevant threshold in a few seconds, understand what the app applies automatically and return to the unchanged game.

## Dependency and phase boundary

Phase 1.6 compact landscape is a prerequisite and is implemented separately before Phase 2a. The Phase 2a implementation plan may assume that the compact header, the `Partita` menu and the top-layer player-details pattern already exist. Phase 2a adds the rules content, its `Regole` trigger and its rules dialog; it does not reimplement the compact player layout.

## Goals

- Make the implemented thresholds and Commander-damage behavior understandable and trustworthy.
- Keep every rule available offline through static, versioned content.
- Use the domain constants for numerical values so copy and implementation cannot diverge.
- Work in portrait, desktop and compact landscape without navigating away from the active game.
- Show official rule numbers as secondary evidence for table discussions.

## Non-goals

- No complete Commander rulebook.
- No search, card database, external API or network dependency.
- No automated adjudication beyond the existing game rules.
- No Commander-tax counter in this phase.
- No external link required for the primary flow.
- No duplicated rule links inside every player panel.

## Access

Add one top-level `Regole` button to the match controls.

- Standard layout: labelled button after `Azzera punteggi` and before `Preferenze`.
- Compact landscape: top-level header button immediately before `Partita`.
- Use a simple book/reference icon plus visible text where space allows. If compact width forces icon-only presentation, retain the complete accessible name `Regole Commander`.

Rules remain separate from `Partita`: checking a threshold is an in-game task, while new game, reset and preferences are match management.

## Container

Open a modal `<dialog>` that preserves the scoring screen behind it.

- Standard desktop/tablet: right-side sheet, maximum width 36rem.
- Phone portrait: nearly full-width dialog with outer spacing.
- Compact landscape: right-side sheet with 8px inset, maximum height `100dvh - 16px` and internal scrolling.
- Header contains `Regole Commander` and a 44×44 Close button.
- Esc closes it; focus returns to `Regole`.
- Background content is inert while open.

The surface may share focus-management and top-layer primitives with the player-details dialog, but it is not a destructive confirmation dialog and must not inherit destructive styling.

## Information architecture

Use one scrollable document with three groups. Do not use tabs, nested cards or a search field for seven entries.

### Soglie della partita

- Vita iniziale
- Vita a zero
- Veleno

### Danni Commander

- Soglia di 21
- Perdita di vita automatica
- Partner

### Zona di comando

- Tassa del comandante

Each item has:

1. a short title;
2. one concise explanatory paragraph;
3. the official rule number in muted secondary text.

Use dividers and spacing to create rhythm instead of placing every rule in a separate card. Numerical thresholds are bold, but color is not required to understand them.

*(Superseded by D-033, 2026-10-19: the app now tracks Commander tax, so no item carries a status badge.)* Only the Commander-tax item received a status badge: `Non tracciata dall’app`. Repeating `Applicata dall’app` on all other items would add noise; the introduction explains that the preceding thresholds are the ones the app uses.

## Final Italian copy

Numerical placeholders are rendered from the domain constants rather than duplicated literals in the content model.

### Introduction

> Queste sono le regole che spiegano i punteggi mostrati da Commander Companion.

### R1 — Vita iniziale

> Ogni giocatore inizia la partita con **40** punti vita.

Secondary reference: `Regola 903.7`

### R2 — Vita a zero

> Un giocatore con **0 o meno** punti vita perde. La vita può scendere sotto zero.

Secondary reference: `Regola 704.5a`

### R3 — Veleno

> Un giocatore con **10 o più** segnalini veleno perde.

Secondary reference: `Regola 704.5c`

### R4 — Danni Commander

> Un giocatore perde dopo aver subito **21 o più danni da combattimento dallo stesso comandante** nel corso della partita. I danni di comandanti diversi non si sommano, anche se appartengono allo stesso avversario.

Secondary reference: `Regole 903.10a e 704.6c`

### R5 — Riducono anche la vita

> Quando registri danni Commander, l’app riduce automaticamente anche i punti vita dello stesso valore.

Secondary reference: `Regola 903.10a`

### R6 — Partner

> Con Partner, ciascun comandante ha un conteggio separato verso la soglia di **21**.

Secondary reference: `Regole 702.124 e 903.10a`

### R7 — Tassa del comandante

Status: none since D-033 (2026-10-19); previously `Non tracciata dall’app`.

> Lanciare un comandante dalla zona di comando costa **{2} in più** per ogni volta precedente in cui è stato lanciato da lì. Nell’app la segni con «Tassa»: ogni tocco aggiunge **{2}**; con Partner ogni comandante ha la sua tassa.

Secondary reference: `Regola 903.8`

Render `{2}` as a compact textual mana-cost token, not as downloaded card art or a network asset. Its accessible text is `due mana generici`.

### Footer

> Regole aggiornate al 25 settembre 2026. Riferimento sintetico: non sostituisce le regole ufficiali.

The date is visible, not hidden in metadata, because rule currency is part of user trust.

## Commander-damage helper copy

Replace the current helper:

> Ogni danno Commander riduce anche i punti vita.

with:

> Registra qui solo i danni da combattimento del comandante: riducono anche i punti vita.

This correction appears wherever Commander-damage controls are rendered, including the compact player-details dialog.

## Visual treatment

- Use the existing near-black raised surface, standard border and panel shadow.
- Use system UI typography; no display or fantasy font in rule text.
- Group headings use the normal compact heading scale, not uppercase tracked labels.
- Rule references and the update date use muted text only after contrast verification.
- Bold thresholds provide emphasis; avoid colored number chips or one card per rule.
- The `Non tracciata dall’app` badge uses a neutral or gold-outline treatment, not danger red: it is a capability boundary, not an error.
- Keep prose to a readable measure of approximately 65ch.

## Interaction and state

- Opening or closing the reference never changes game state or history.
- Scroll position may reset to the start on each new opening; no persistence is required.
- Only one modal dialog may be open at a time. In compact mode, users close player details before opening the top-level rules reference.
- The dialog has no confirmation action. Close is always safe.
- No entrance animation is required. If the shared sheet uses a short transition, reduced-motion mode makes it instant.

## Content model

The static typed module should distinguish:

- stable item identifier (`R1`…`R7`);
- group;
- title;
- body fragments capable of interpolating domain constants;
- rule references;
- optional capability status;
- rules-effective date.

Copy assembly must use `STARTING_LIFE`, `POISON_LIMIT` and `COMMANDER_DAMAGE_LIMIT` from the domain. Tests verify that the rendered or assembled content contains the current constants.

The content model may contain presentation-neutral emphasis markers, but it must not embed component class names or HTML strings.

## Accessibility and resilience

- Dialog focus is trapped and restored to the `Regole` opener.
- Close control and any icon-only trigger are at least 44×44 with visible focus.
- Headings form a logical hierarchy and allow screen-reader navigation.
- Rule references are text, not tooltip-only content.
- At 200% zoom the dialog becomes a single scrollable column without horizontal scrolling.
- `{2}` has an accessible spoken label.
- The status `Non tracciata dall’app` is explicit text and does not rely on color.
- The reference remains fully available offline after the app shell is cached.

## Acceptance criteria

- `Regole` is reachable from standard and compact headers.
- The active game remains visible behind the modal and is unchanged after closing it.
- R1–R7 appear in the groups and order specified above.
- Rule numbers and the effective date are visible.
- ~~R7 is clearly marked as not tracked by the app.~~ Since D-033, R7 explains how the app tracks the tax, Partner included.
- The Commander-damage helper uses the corrected combat-damage wording everywhere.
- Numerical copy is derived from domain constants and covered by tests.
- The dialog works at 320px portrait, 768px, 1440px, 844×390 and 844×330.
- Keyboard-only, screen-reader, 200% zoom and reduced-motion checks pass.

## Builder discretion

The builder may choose component names, whether rule groups are represented as enums or string unions, and when to extract a shared sheet shell. The builder may not change access placement, copy, grouping, capability status or focus behavior without design review.
