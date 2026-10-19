# Architecture

## Boundaries

```text
React UI (App + components)
          ↓ typed GameAction
History reducer (src/game/history.ts)  — bounded undo/redo, 700 ms tap groups, external-tab steps
          ↓
Pure domain reducer (src/game/game.ts) — all scoring rules and bounds
          ↓ current snapshot
Local persistence (src/game/storage.ts) — validation, migration, backup, tab sync
```

Platform adapters live outside the domain:

- `src/platform/useWakeLock.ts` keeps the screen on during play.
- `src/settings/preferences.ts` stores validated device preferences (`keepScreenOn`).
- `src/content/rules.ts` is the static, versioned rules reference; its numbers come from the domain constants.
- `src/media/` holds the only network code (Scryfall commander search, art download), the IndexedDB art cache and the contrast analysis that strengthens the artwork veil (D-026).
- `src/platform/useCompactDensity.ts` is the single source of the compact-density condition (`(max-height: 30rem)`, no orientation; D-034). The four-player layout is a separate preference in `src/settings/preferences.ts` (`fourPlayerLayout`), outside the game, its storage and its history.
- `src/pwa/` registers the service worker (`register.ts`, production only) and exposes update state through a tiny external store (`updates.ts`).

`game.ts` contains all scoring rules and never touches the DOM. Components dispatch actions and render state; they do not recalculate rule thresholds (`getDefeatReasons`, `canRemovePartner` are exported for the UI). Every action that would not change the game returns the same state reference, so history never records an empty step.

## Rules implemented

| Rule | Implementation |
| --- | --- |
| 40 starting life, 2–4 players | `createGame` |
| Life may be negative | clamped only to ±999 999 |
| 0 or less life loses (704.5a) | `getDefeatReasons → 'life'` |
| 10+ poison loses (704.5c) | `'poison'` |
| 21+ combat damage from the same commander loses (903.10a, 704.6c) | `'commander-damage'`, tracked per commander |
| Commander damage is also life loss | `adjust-commander-damage` moves life by the applied amount (D-006) |
| Partner commanders count separately | `hasPartner` + `[number, number]` per source (D-007) |

## Schema (version 5)

```ts
GameState {
  version: 5,
  players: PlayerState[],
  monarchPlayerId: string | null,      // table-wide (D-033): one holder at most
  initiativePlayerId: string | null,   // the same player may hold both
}
PlayerState {
  id, name, life, poison, energy, experience, rad, accent,
  hasPartner: boolean,
  commanderDamage: Record<sourcePlayerId, [commander1, commander2]>,
  commanders: [Commander1 | null, Commander2 | null]   // { cardId, name, artist }; slot 2 only with partner; art bytes in IndexedDB
  commanderTax: [commander1, commander2]               // generic mana, always even; slot 2 is 0 without partner
}
```

Invariants enforced by `parseStoredGame`: 2–4 players, unique ids, names 1–28 code points, bounded safe integers, damage only from known other players, partner damage and tax only when the player has a partner, table roles only for players at the table.

## Storage

- Key `commander-companion.game.v1` (historical name; the payload `version` drives parsing).
- Version 1–4 payloads are migrated to version 5 (v1 values are clamped; v2 gains empty slots; v3 `commander` becomes slot 1; v4 gains zero rad and tax and no table roles).
- Unreadable or future-version payloads are copied to `commander-companion.game.backup` before a new game starts; the UI says so.
- Writes are synchronous on every change; a failed write is surfaced in the UI.
- `navigator.storage.persist()` is requested once.
- The `storage` event keeps several tabs in sync; an external game becomes an undoable step.

## State history

Up to 50 prior snapshots in memory. Consecutive same-direction taps on the same value within 700 ms merge into one step; `getGroupDelta` exposes the cumulative change for the UI. Undo/redo history intentionally does not survive refresh; only the latest match state is persisted. New game clears history; reset is an undoable step.

## Offline

`vite-plugin-pwa` precaches the app shell. Updates use the `prompt` strategy: a new version waits until the player taps “Aggiorna”, so a game is never reloaded mid-turn.

## Extension points

- Personal media: add a validated `background` field to `PlayerState`, bump the schema to v3 with a pure migration, then render it through a contrast overlay in `PlayerPanel`.
- Custom counters: replace fixed counter properties with a typed counter collection only when the UX for adding/removing counters is designed.
- Rules reference: add a static, versioned content module before considering a network API.
- Shared games: introduce a transport adapter around `GameAction`; do not put socket calls inside the reducer.
