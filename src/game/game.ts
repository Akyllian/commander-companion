import { GAME_SCHEMA_VERSION, PLAYER_ACCENTS } from './types'
import type {
  CommanderArt,
  CommanderDamageBySource,
  CommanderSlots,
  CommanderTaxBySlot,
  DeckLinkSource,
  GameAction,
  GameState,
  PlayerState,
} from './types'

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 4
export const DEFAULT_PLAYERS = 4
export const STARTING_LIFE = 40
/** Rule 704.5a: 0 or less life. */
export const LIFE_DEFEAT_LIMIT = 0
/** Rule 704.5c: ten or more poison counters. */
export const POISON_LIMIT = 10
/** Rule 903.10a / 704.6c: 21 or more combat damage from the same commander. */
export const COMMANDER_DAMAGE_LIMIT = 21
export const NAME_MAX_LENGTH = 28
/** Domain bounds keep every stored value a safe integer (D-004). */
export const LIFE_MIN = -999_999
export const LIFE_MAX = 999_999
export const COUNTER_MAX = 999_999
/** Commander tax moves in steps of two generic mana (rule 903.8). */
export const COMMANDER_TAX_STEP = 2
const COMMANDER_TAX_MAX = COUNTER_MAX - (COUNTER_MAX % COMMANDER_TAX_STEP)

export type DefeatReason = 'life' | 'poison' | 'commander-damage'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const clampLife = (value: number) => clamp(value, LIFE_MIN, LIFE_MAX)
const clampCounter = (value: number) => clamp(value, 0, COUNTER_MAX)
const isValidAmount = (amount: number) => Number.isSafeInteger(amount) && amount !== 0

const clampPlayerCount = (count: number) =>
  Number.isFinite(count) ? clamp(Math.round(count), MIN_PLAYERS, MAX_PLAYERS) : DEFAULT_PLAYERS

export const COMMANDER_TEXT_MAX_LENGTH = 200
const CARD_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const isCommanderText = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value === value.trim() && Array.from(value).length <= COMMANDER_TEXT_MAX_LENGTH

/** True for a stored commander: canonical UUID and already-trimmed, bounded text. */
export function isCommanderArt(value: unknown): value is CommanderArt {
  if (typeof value !== 'object' || value === null) return false
  const { cardId, name, artist } = value as Record<string, unknown>
  return typeof cardId === 'string' && CARD_ID_PATTERN.test(cardId) && isCommanderText(name) && isCommanderText(artist)
}

/** Trims input from the picker; returns null when it cannot be stored. */
export function normalizeCommander(commander: CommanderArt): CommanderArt | null {
  const normalized = { cardId: commander.cardId, name: commander.name.trim(), artist: commander.artist.trim() }
  return isCommanderArt(normalized) ? normalized : null
}

/** Trims and truncates by code point, so an emoji is never split in half. */
export function normalizePlayerName(name: string): string {
  return Array.from(name.trim()).slice(0, NAME_MAX_LENGTH).join('').trim()
}

export function createGame(playerCount = DEFAULT_PLAYERS): GameState {
  const count = clampPlayerCount(playerCount)

  return {
    version: GAME_SCHEMA_VERSION,
    players: Array.from({ length: count }, (_, index) => ({
      id: `player-${index + 1}`,
      name: `Giocatore ${index + 1}`,
      life: STARTING_LIFE,
      poison: 0,
      energy: 0,
      experience: 0,
      rad: 0,
      accent: PLAYER_ACCENTS[index],
      hasPartner: false,
      commanderDamage: {},
      commanders: [null, null],
      commanderTax: [0, 0],
      deck: null,
    })),
    monarchPlayerId: null,
    initiativePlayerId: null,
  }
}

export function getDefeatReasons(player: PlayerState): DefeatReason[] {
  const reasons: DefeatReason[] = []
  if (player.life <= LIFE_DEFEAT_LIMIT) reasons.push('life')
  if (player.poison >= POISON_LIMIT) reasons.push('poison')
  if (
    Object.values(player.commanderDamage).some((damage) =>
      damage.some((value) => value >= COMMANDER_DAMAGE_LIMIT),
    )
  ) {
    reasons.push('commander-damage')
  }
  return reasons
}

export function isPlayerDefeated(player: PlayerState): boolean {
  return getDefeatReasons(player).length > 0
}

/** A partner can be removed only while no player has recorded damage from it and its tax is zero. */
export function canRemovePartner(state: GameState, playerId: string): boolean {
  const owner = state.players.find((player) => player.id === playerId)
  if (!owner || owner.commanderTax[1] !== 0) return false
  return state.players.every((player) => (player.commanderDamage[playerId]?.[1] ?? 0) === 0)
}

const TABLE_ROLE_KEYS = { monarch: 'monarchPlayerId', initiative: 'initiativePlayerId' } as const

/** Deck ids are generated UUIDs; anything longer is not one of ours. */
export const DECK_ID_MAX_LENGTH = 64

const sameCommander = (left: CommanderArt | null, right: CommanderArt | null) =>
  left?.cardId === right?.cardId && left?.name === right?.name && left?.artist === right?.artist

/** A manual commander change on a linked seat is an override for this match only (R3 §11.2). */
const overridden = (player: PlayerState): PlayerState =>
  player.deck && !player.deck.overridden ? { ...player, deck: { ...player.deck, overridden: true } } : player

/** Each surviving seat of a new game keeps its deck link; seats beyond the new count lose theirs. */
export function carryDeckLinks(previous: GameState, next: GameState): GameState {
  const links = new Map(previous.players.map((player) => [player.id, player.deck]))
  if (!next.players.some((player) => links.get(player.id))) return next
  return { ...next, players: next.players.map((player) => ({ ...player, deck: links.get(player.id) ?? null })) }
}

/**
 * A confirmed new game with its links already resolved (R3 §11.2, plan fix 3): linked seats get
 * their deck's current commanders; a deck that no longer exists keeps the commanders already
 * applied, and its link, so the seat can say «Mazzo non disponibile». One state, one replace.
 */
export function startGameWithLinks(previous: GameState, playerCount: number, decks: Map<string, DeckLinkSource | null>): GameState {
  const before = new Map(previous.players.map((player) => [player.id, player]))
  let next = carryDeckLinks(previous, createGame(playerCount))
  for (const player of next.players) {
    if (!player.deck) continue
    const source = decks.get(player.deck.deckId)
    if (source) {
      next = gameReducer(next, { type: 'link-deck', playerId: player.id, deckId: player.deck.deckId, commanders: source.commanders, hasPartner: source.hasPartner })
      continue
    }
    const old = before.get(player.id) as PlayerState
    next = updatePlayer(next, player.id, (seat) => ({ ...seat, hasPartner: old.hasPartner, commanders: old.commanders, deck: { deckId: seat.deck?.deckId as string, overridden: false } }))
  }
  return next
}


function updatePlayer(
  state: GameState,
  playerId: string,
  update: (player: PlayerState) => PlayerState,
): GameState {
  const index = state.players.findIndex((player) => player.id === playerId)
  if (index === -1) return state

  const current = state.players[index]
  const next = update(current)
  if (next === current) return state

  const players = state.players.slice()
  players[index] = next
  return { ...state, players }
}

/**
 * Pure scoring reducer. Any action that would not change the game returns the
 * same state reference, so history never records an empty step.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'adjust-life': {
      if (!isValidAmount(action.amount)) return state
      return updatePlayer(state, action.playerId, (player) => {
        const life = clampLife(player.life + action.amount)
        return life === player.life ? player : { ...player, life }
      })
    }

    case 'adjust-counter': {
      if (!isValidAmount(action.amount)) return state
      return updatePlayer(state, action.playerId, (player) => {
        const value = clampCounter(player[action.counter] + action.amount)
        return value === player[action.counter] ? player : { ...player, [action.counter]: value }
      })
    }

    case 'adjust-commander-damage': {
      if (!isValidAmount(action.amount) || action.playerId === action.sourcePlayerId) return state
      const source = state.players.find((player) => player.id === action.sourcePlayerId)
      if (!source || (action.commander === 1 && !source.hasPartner)) return state

      return updatePlayer(state, action.playerId, (player) => {
        const previous = player.commanderDamage[source.id] ?? [0, 0]
        const value = clampCounter(previous[action.commander] + action.amount)
        const applied = value - previous[action.commander]
        if (applied === 0) return player

        const damage: CommanderDamageBySource = [previous[0], previous[1]]
        damage[action.commander] = value
        return {
          ...player,
          // Commander damage is ordinary damage too: life moves by the applied amount (D-006).
          life: clampLife(player.life - applied),
          commanderDamage: { ...player.commanderDamage, [source.id]: damage },
        }
      })
    }

    case 'adjust-commander-tax': {
      if (!isValidAmount(action.amount) || action.amount % COMMANDER_TAX_STEP !== 0) return state
      return updatePlayer(state, action.playerId, (player) => {
        if (action.commander === 1 && !player.hasPartner) return player
        const value = clamp(player.commanderTax[action.commander] + action.amount, 0, COMMANDER_TAX_MAX)
        if (value === player.commanderTax[action.commander]) return player
        const commanderTax: CommanderTaxBySlot = [player.commanderTax[0], player.commanderTax[1]]
        commanderTax[action.commander] = value
        return { ...player, commanderTax }
      })
    }

    case 'set-table-role': {
      const key = TABLE_ROLE_KEYS[action.role]
      if (action.playerId !== null && !state.players.some((player) => player.id === action.playerId)) return state
      return state[key] === action.playerId ? state : { ...state, [key]: action.playerId }
    }

    case 'set-partner': {
      if (!action.hasPartner && !canRemovePartner(state, action.playerId)) return state
      return updatePlayer(state, action.playerId, (player) => {
        if (player.hasPartner === action.hasPartner) return player
        // Without a partner the second commander slot no longer exists (D-027).
        const commanders: CommanderSlots = action.hasPartner ? player.commanders : [player.commanders[0], null]
        return overridden({ ...player, hasPartner: action.hasPartner, commanders })
      })
    }

    case 'set-commander': {
      const commander = action.commander && normalizeCommander(action.commander)
      if (action.commander && !commander) return state
      return updatePlayer(state, action.playerId, (player) => {
        if (action.slot === 1 && !player.hasPartner) return player
        const current = player.commanders[action.slot]
        if (
          current?.cardId === commander?.cardId &&
          current?.name === commander?.name &&
          current?.artist === commander?.artist
        ) {
          return player
        }
        const commanders: CommanderSlots = [player.commanders[0], player.commanders[1]]
        commanders[action.slot] = commander
        return overridden({ ...player, commanders })
      })
    }

    case 'rename-player': {
      const name = normalizePlayerName(action.name)
      return updatePlayer(state, action.playerId, (player) =>
        !name || name === player.name ? player : { ...player, name },
      )
    }

    case 'remove-player': {
      if (
        state.players.length <= MIN_PLAYERS ||
        !state.players.some((player) => player.id === action.playerId)
      ) {
        return state
      }

      return {
        ...state,
        monarchPlayerId: state.monarchPlayerId === action.playerId ? null : state.monarchPlayerId,
        initiativePlayerId: state.initiativePlayerId === action.playerId ? null : state.initiativePlayerId,
        players: state.players
          .filter((player) => player.id !== action.playerId)
          .map((player) => {
            const { [action.playerId]: _removed, ...commanderDamage } = player.commanderDamage
            return { ...player, commanderDamage }
          }),
      }
    }

    case 'link-deck': {
      const commanders = action.commanders.map((slot) => slot && normalizeCommander(slot)) as CommanderSlots
      const valid =
        action.deckId.length > 0 &&
        action.deckId.length <= DECK_ID_MAX_LENGTH &&
        commanders[0] !== null &&
        action.commanders.every((slot, index) => slot === null || commanders[index] !== null)
      if (!valid) return state
      const slots: CommanderSlots = [commanders[0], action.hasPartner ? commanders[1] : null]
      const owner = state.players.find((player) => player.id === action.playerId)
      // A Partner with recorded damage or tax cannot be dropped by a deck either (D-027).
      if (owner?.hasPartner && !action.hasPartner && !canRemovePartner(state, action.playerId)) return state
      return updatePlayer(state, action.playerId, (player) => {
        const same =
          player.deck?.deckId === action.deckId &&
          !player.deck.overridden &&
          player.hasPartner === action.hasPartner &&
          sameCommander(player.commanders[0], slots[0]) &&
          sameCommander(player.commanders[1], slots[1])
        return same ? player : { ...player, hasPartner: action.hasPartner, commanders: slots, deck: { deckId: action.deckId, overridden: false } }
      })
    }

    case 'unlink-deck':
      return updatePlayer(state, action.playerId, (player) => {
        if (!player.deck) return player
        return { ...player, deck: null, commanders: action.keepCommander ? player.commanders : [null, null] }
      })

    case 'reset-game':
      return {
        ...state,
        players: state.players.map((player) => ({
          ...player,
          life: STARTING_LIFE,
          poison: 0,
          energy: 0,
          experience: 0,
          rad: 0,
          commanderDamage: {},
          commanderTax: [0, 0],
        })),
        monarchPlayerId: null,
        initiativePlayerId: null,
      }
  }
}

export type { GameAction, GameState, PlayerState } from './types'
