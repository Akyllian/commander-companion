export const PLAYER_ACCENTS = ['verdigris', 'gold', 'violet', 'ember'] as const

export type PlayerAccent = (typeof PLAYER_ACCENTS)[number]
export type CounterKey = 'poison' | 'energy' | 'experience' | 'rad'

/** Table-wide states: each is held by at most one player, and one player may hold both (D-033). */
export type TableRole = 'monarch' | 'initiative'

/** 0 = main commander, 1 = partner commander (only meaningful when the source has a partner). */
export type CommanderIndex = 0 | 1

/** Damage received from each of a source player's commanders, indexed by `CommanderIndex`. */
export type CommanderDamageBySource = [number, number]

/** Extra generic mana to cast each of the player's own commanders, indexed by `CommanderIndex` (D-033). */
export type CommanderTaxBySlot = [number, number]

/** The player's commander card, used for panel artwork (Phase 2c, D-026). Art bytes live in IndexedDB. */
export interface CommanderArt {
  /** Scryfall card id (UUID); also the key of the cached art crop. */
  cardId: string
  name: string
  /** Credited wherever the art is shown (Fan Content Policy, D-025). */
  artist: string
}

export interface PlayerState {
  id: string
  name: string
  life: number
  poison: number
  energy: number
  experience: number
  rad: number
  accent: PlayerAccent
  /** True when this player's deck has two commanders (partner). */
  hasPartner: boolean
  /** Commander damage received, keyed by the source player id. */
  commanderDamage: Record<string, CommanderDamageBySource>
  /**
   * Commander slots, indexed by `CommanderIndex` like the damage labels ("Comandante 1/2").
   * Slot 1 is only used by partner decks (D-027).
   */
  commanders: CommanderSlots
  /** Commander tax per own commander slot; slot 1 stays 0 without Partner. Always even. */
  commanderTax: CommanderTaxBySlot
}

export type CommanderSlots = [CommanderArt | null, CommanderArt | null]

export const GAME_SCHEMA_VERSION = 5

export interface GameState {
  version: typeof GAME_SCHEMA_VERSION
  players: PlayerState[]
  monarchPlayerId: string | null
  initiativePlayerId: string | null
}

export type GameAction =
  | { type: 'adjust-life'; playerId: string; amount: number }
  | { type: 'adjust-counter'; playerId: string; counter: CounterKey; amount: number }
  | {
      /** Commander damage is combat damage: it also changes life by the same applied amount (D-006). */
      type: 'adjust-commander-damage'
      playerId: string
      sourcePlayerId: string
      commander: CommanderIndex
      amount: number
    }
  | { type: 'adjust-commander-tax'; playerId: string; commander: CommanderIndex; amount: number }
  | { type: 'set-table-role'; role: TableRole; playerId: string | null }
  | { type: 'set-partner'; playerId: string; hasPartner: boolean }
  | { type: 'set-commander'; playerId: string; slot: CommanderIndex; commander: CommanderArt | null }
  | { type: 'rename-player'; playerId: string; name: string }
  | { type: 'remove-player'; playerId: string }
  | { type: 'reset-game' }
