import { createGame, gameReducer, LIFE_MAX } from './game'
import {
  BACKUP_KEY,
  loadGame,
  parseStoredGame,
  requestPersistentStorage,
  saveGame,
  STORAGE_KEY,
  subscribeToExternalChanges,
} from './storage'
import type { GameState } from './types'

const store = (value: unknown) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value))

const v1Game = (): { version: number; players: Array<Record<string, unknown> & { life: number; commanderDamage: Record<string, unknown> }> } => ({
  version: 1,
  players: [
    {
      id: 'player-1',
      name: 'Atraxa',
      life: 31,
      poison: 2,
      energy: 0,
      experience: 1,
      accent: 'verdigris',
      commanderDamage: { 'player-2': 9 },
    },
    {
      id: 'player-2',
      name: 'Giocatore 2',
      life: 40,
      poison: 0,
      energy: 0,
      experience: 0,
      accent: 'gold',
      commanderDamage: {},
    },
  ],
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadGame', () => {
  it('starts a new four-player game when nothing is stored', () => {
    const result = loadGame()
    expect(result.status).toBe('new')
    expect(result.game).toEqual(createGame())
  })

  it('round-trips a valid active game', () => {
    let game = createGame(3)
    game = gameReducer(game, { type: 'set-partner', playerId: 'player-2', hasPartner: true })
    game = gameReducer(game, {
      type: 'adjust-commander-damage',
      playerId: 'player-1',
      sourcePlayerId: 'player-2',
      commander: 1,
      amount: 6,
    })

    expect(saveGame(game)).toBe(true)
    expect(loadGame()).toEqual({ status: 'restored', game })
  })

  it('migrates a version 1 game without losing scores', () => {
    store(v1Game())

    const result = loadGame()

    expect(result.status).toBe('migrated')
    expect(result.game.version).toBe(3)
    expect(result.game.players[0]).toMatchObject({
      name: 'Atraxa',
      life: 31,
      poison: 2,
      experience: 1,
      hasPartner: false,
      commander: null,
      commanderDamage: { 'player-2': [9, 0] },
    })
  })

  it('clamps out-of-range version 1 values instead of discarding the game', () => {
    const legacy = v1Game()
    legacy.players[0].life = LIFE_MAX * 10
    store(legacy)

    expect(loadGame().game.players[0].life).toBe(LIFE_MAX)
  })

  it('backs up an unreadable payload before replacing it', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json')

    const result = loadGame()

    expect(result.status).toBe('recovered')
    expect(result.game).toEqual(createGame())
    expect(localStorage.getItem(BACKUP_KEY)).toBe('{not-json')
  })

  it('backs up a payload written by a newer app version', () => {
    const future = JSON.stringify({ ...createGame(2), version: 4 })
    localStorage.setItem(STORAGE_KEY, future)

    expect(loadGame().status).toBe('recovered')
    expect(localStorage.getItem(BACKUP_KEY)).toBe(future)
  })

  it('reports storage that cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    expect(loadGame()).toEqual({ status: 'unavailable', game: createGame() })
  })

  it('still recovers when the backup cannot be written', () => {
    localStorage.setItem(STORAGE_KEY, 'null')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(loadGame().status).toBe('recovered')
  })
})

describe('parseStoredGame rejects corrupted data', () => {
  const corruptions: Array<[string, (game: GameState) => void]> = [
    ['negative counters', (game) => (game.players[0].poison = -1)],
    ['fractional scores', (game) => (game.players[0].energy = 1.5)],
    ['life outside bounds', (game) => (game.players[0].life = LIFE_MAX + 1)],
    ['duplicate player ids', (game) => (game.players[1].id = game.players[0].id)],
    ['empty ids', (game) => (game.players[0].id = ' ')],
    ['blank names', (game) => (game.players[0].name = '   ')],
    ['names over 28 characters', (game) => (game.players[0].name = 'x'.repeat(29))],
    ['unknown accents', (game) => ((game.players[0] as { accent: string }).accent = 'pink')],
    ['non-boolean partner flags', (game) => ((game.players[0] as { hasPartner: unknown }).hasPartner = 1)],
    ['unknown Commander sources', (game) => (game.players[0].commanderDamage['ghost'] = [21, 0])],
    ['self Commander damage', (game) => (game.players[0].commanderDamage['player-1'] = [1, 0])],
    ['malformed damage tuples', (game) => ((game.players[0].commanderDamage as Record<string, unknown>)['player-2'] = [1])],
    ['negative damage', (game) => (game.players[0].commanderDamage['player-2'] = [-1, 0])],
    ['partner damage without a partner', (game) => (game.players[0].commanderDamage['player-2'] = [0, 4])],
    ['too few players', (game) => (game.players = game.players.slice(0, 1))],
    ['non-object players', (game) => ((game.players as unknown[])[0] = 'player')],
  ]

  it.each(corruptions)('rejects %s', (_label, corrupt) => {
    const game = structuredClone(createGame(2))
    corrupt(game)
    expect(parseStoredGame(game)).toBeNull()
  })

  it.each([null, 42, 'game', [], { version: 3 }, { version: 3, players: {} }, { version: 2, players: {} }])(
    'rejects non-game value %j',
    (value) => {
      expect(parseStoredGame(value)).toBeNull()
    },
  )

  it('rejects a version 1 game with invalid structure', () => {
    const legacy = v1Game()
    legacy.players[0].commanderDamage = { 'player-2': 'nine' }
    expect(parseStoredGame(legacy)).toBeNull()
    expect(parseStoredGame({ ...v1Game(), players: ['player', v1Game().players[1]] })).toBeNull()
  })

  it('rejects a version 1 game whose migration breaks current rules', () => {
    const legacy = v1Game()
    legacy.players[0].commanderDamage = { 'player-1': 3 }
    expect(parseStoredGame(legacy)).toBeNull()
  })

  it('rejects non-finite numbers in raw JSON', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(createGame(2)).replace('"life":40', '"life":1e400'))
    expect(loadGame().status).toBe('recovered')
  })
})

describe('saveGame', () => {
  it('reports a failed write without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(saveGame(createGame())).toBe(false)
  })
})

describe('subscribeToExternalChanges', () => {
  const emit = (key: string | null, newValue: string | null) =>
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }))

  it('delivers valid games written by another tab', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToExternalChanges(listener)
    const game = gameReducer(createGame(2), { type: 'adjust-life', playerId: 'player-1', amount: -3 })

    emit(STORAGE_KEY, JSON.stringify(game))
    emit('another-key', JSON.stringify(game))
    emit(STORAGE_KEY, null)
    emit(STORAGE_KEY, '{broken')
    unsubscribe()
    emit(STORAGE_KEY, JSON.stringify(game))

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(game)
  })
})

describe('requestPersistentStorage', () => {
  it('asks the browser to keep the data when supported', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('navigator', { storage: { persisted: vi.fn().mockResolvedValue(false), persist } })

    await expect(requestPersistentStorage()).resolves.toBe(true)
    expect(persist).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('does not ask again when already persisted', async () => {
    const persist = vi.fn()
    vi.stubGlobal('navigator', { storage: { persisted: vi.fn().mockResolvedValue(true), persist } })

    await expect(requestPersistentStorage()).resolves.toBe(true)
    expect(persist).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('resolves false when unsupported or rejected', async () => {
    vi.stubGlobal('navigator', {})
    await expect(requestPersistentStorage()).resolves.toBe(false)
    vi.stubGlobal('navigator', { storage: { persisted: vi.fn().mockRejectedValue(new Error('x')), persist: vi.fn() } })
    await expect(requestPersistentStorage()).resolves.toBe(false)
    vi.unstubAllGlobals()
  })
})

describe('schema v3: commander art (D-026)', () => {
  const zimone = { cardId: 'ca09bb5f-feab-4754-ac6b-3f06327d3fe9', name: 'Zimone, All-Questioning', artist: 'Ekaterina Burmak' }

  it('round-trips a player commander', () => {
    const game = gameReducer(createGame(2), { type: 'set-commander', playerId: 'player-1', commander: zimone })
    saveGame(game)
    expect(loadGame()).toEqual({ status: 'restored', game })
  })

  it('migrates a version 2 game, adding no commander', () => {
    const v2 = structuredClone(createGame(2)) as unknown as { version: number; players: Array<Record<string, unknown>> }
    v2.version = 2
    v2.players.forEach((player) => delete player.commander)
    store(v2)
    const result = loadGame()
    expect(result.status).toBe('migrated')
    expect(result.game).toEqual(createGame(2))
  })

  it('rejects a version 2 game with invalid structure', () => {
    expect(parseStoredGame({ version: 2, players: [{ id: 'x' }, { id: 'y' }] })).toBeNull()
  })

  it.each([
    ['a non-object commander', 'Zimone'],
    ['a malformed card id', { ...zimone, cardId: '../evil' }],
    ['a missing artist', { cardId: zimone.cardId, name: zimone.name }],
    ['an untrimmed name', { ...zimone, name: ' Zimone ' }],
  ])('rejects %s', (_label, commander) => {
    const game = structuredClone(createGame(2)) as unknown as { players: Array<Record<string, unknown>> }
    game.players[0].commander = commander
    expect(parseStoredGame(game)).toBeNull()
  })
})
