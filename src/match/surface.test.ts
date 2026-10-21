import { blocksSeats, CLOSED, surfaceReducer } from './surface'
import type { Surface } from './surface'

const hub: Surface = { kind: 'hub' }
const dice: Surface = { kind: 'tool', tool: 'dice' }
const counters: Surface = { kind: 'counters', playerId: 'player-1' }
const commander: Surface = { kind: 'commander', playerId: 'player-2' }

describe('single transient surface (R2 §2.5)', () => {
  it.each([CLOSED, hub, dice, counters, commander])('opening a surface replaces %o', (from) => {
    expect(surfaceReducer(from, { type: 'open', surface: commander })).toEqual(commander)
  })

  it('toggles the hub: open from closed or a card surface, closed from hub or tool', () => {
    expect(surfaceReducer(CLOSED, { type: 'toggle-hub' })).toEqual(hub)
    expect(surfaceReducer(counters, { type: 'toggle-hub' })).toEqual(hub)
    expect(surfaceReducer(commander, { type: 'toggle-hub' })).toEqual(hub)
    expect(surfaceReducer(hub, { type: 'toggle-hub' })).toBe(CLOSED)
    expect(surfaceReducer(dice, { type: 'toggle-hub' })).toBe(CLOSED)
  })

  it('goes back from a tool to the hub, and is a no-op elsewhere', () => {
    expect(surfaceReducer(dice, { type: 'back-to-hub' })).toEqual(hub)
    for (const surface of [CLOSED, hub, counters]) expect(surfaceReducer(surface, { type: 'back-to-hub' })).toBe(surface)
  })

  it('closes everything on close and on a layout change', () => {
    for (const surface of [hub, dice, counters, commander]) {
      expect(surfaceReducer(surface, { type: 'close' })).toBe(CLOSED)
      expect(surfaceReducer(surface, { type: 'layout-changed' })).toBe(CLOSED)
    }
    expect(surfaceReducer(CLOSED, { type: 'close' })).toBe(CLOSED)
  })

  it('closes a card surface whose player left, keeping everything else', () => {
    expect(surfaceReducer(counters, { type: 'players-changed', playerIds: ['player-2'] })).toBe(CLOSED)
    expect(surfaceReducer(commander, { type: 'players-changed', playerIds: ['player-1'] })).toBe(CLOSED)
    expect(surfaceReducer(counters, { type: 'players-changed', playerIds: ['player-1'] })).toBe(counters)
    expect(surfaceReducer(hub, { type: 'players-changed', playerIds: [] })).toBe(hub)
  })

  it('blocks the seats only for the hub and its tools', () => {
    expect([CLOSED, hub, dice, counters, commander].map(blocksSeats)).toEqual([false, true, true, false, false])
  })
})
