# Architecture

## Boundaries

```text
React UI (App + components)
          ↓ typed GameAction
Pure domain reducer (src/game/game.ts)
          ↓ current snapshot
Local persistence (src/game/storage.ts)
```

`game.ts` contains all scoring rules and never touches the DOM. Components dispatch actions and render state; they do not recalculate rule thresholds. `App.tsx` owns bounded undo/redo history and persists only the active snapshot. `storage.ts` validates unknown browser data before returning it to the app.

## Extension points

- Personal media: add a validated `background` field to `PlayerState`, migrate storage version, then render it through a contrast overlay in `PlayerPanel`.
- Custom counters: replace fixed counter properties with a typed counter collection only when the UX for adding/removing counters is designed.
- Rules reference: add a static, versioned content module before considering a network API.
- Shared games: introduce a transport adapter around `GameAction`; do not put socket calls inside the reducer.

## State history

The app keeps up to 50 prior snapshots in memory. Undo/redo history intentionally does not survive refresh; only the latest match state is persisted. This keeps the stored schema small and avoids restoring stale timelines.

## Storage migrations

The payload carries `version: 1`. A future schema change should parse each older version into the newest `GameState`; never cast unvalidated JSON directly.

