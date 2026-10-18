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
- `src/platform/useCompactLandscape.ts` is the single source of the compact-landscape condition.
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

## Schema (version 2)

```ts
PlayerState {
  id, name, life, poison, energy, experience, accent,
  hasPartner: boolean,
  commanderDamage: Record<sourcePlayerId, [commander1, commander2]>
}
```

Invariants enforced by `parseStoredGame`: 2–4 players, unique ids, names 1–28 code points, bounded safe integers, damage only from known other players, partner damage only when the source has a partner.

## Storage

- Key `commander-companion.game.v1` (historical name; the payload `version` drives parsing).
- Version 1 payloads are migrated to version 2, clamping out-of-range values.
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
