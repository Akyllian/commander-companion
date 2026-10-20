/**
 * The one transient surface open in the app (R2 §2.5): the rhombus hub, one of its tools,
 * or a card's Contatori or Danni Commander panel. Opening one closes the previous one.
 */

export type Tool = 'dice' | 'mana' | 'coin'

export type Surface =
  | { kind: 'closed' }
  | { kind: 'hub' }
  | { kind: 'tool'; tool: Tool }
  | { kind: 'counters'; playerId: string }
  | { kind: 'commander'; playerId: string }

export type SurfaceEvent =
  | { type: 'open'; surface: Surface }
  | { type: 'toggle-hub' }
  | { type: 'back-to-hub' }
  | { type: 'close' }
  | { type: 'players-changed'; playerIds: string[] }
  | { type: 'layout-changed' }

export const CLOSED: Surface = { kind: 'closed' }

/** While the hub or a tool is open the seats are inert (R2 §7.2). */
export const blocksSeats = (surface: Surface) => surface.kind === 'hub' || surface.kind === 'tool'

export function surfaceReducer(surface: Surface, event: SurfaceEvent): Surface {
  switch (event.type) {
    case 'open':
      return event.surface
    case 'toggle-hub':
      return blocksSeats(surface) ? CLOSED : { kind: 'hub' }
    case 'back-to-hub':
      return surface.kind === 'tool' ? { kind: 'hub' } : surface
    case 'close':
    case 'layout-changed':
      return CLOSED
    case 'players-changed':
      return (surface.kind === 'counters' || surface.kind === 'commander') && !event.playerIds.includes(surface.playerId)
        ? CLOSED
        : surface
  }
}
