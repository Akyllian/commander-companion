import { createGame } from './game'
import { loadGame, saveGame, STORAGE_KEY } from './storage'

describe('game storage', () => {
  it('falls back to a valid four-player game for malformed data', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json')

    const game = loadGame()

    expect(game.players).toHaveLength(4)
    expect(game.players.every((player) => player.life === 40)).toBe(true)
  })

  it('round-trips a valid active game', () => {
    const game = createGame(2)
    game.players[0].life = 33

    saveGame(game)

    expect(loadGame().players[0].life).toBe(33)
  })

  it.each([
    ['negative counters', (game: ReturnType<typeof createGame>) => (game.players[0].poison = -1)],
    ['duplicate player ids', (game: ReturnType<typeof createGame>) => (game.players[1].id = game.players[0].id)],
    [
      'unknown Commander sources',
      (game: ReturnType<typeof createGame>) => (game.players[0].commanderDamage['ghost-player'] = 21),
    ],
    ['fractional scores', (game: ReturnType<typeof createGame>) => (game.players[0].energy = 1.5)],
  ])('rejects %s in stored games', (_label, corrupt) => {
    const game = createGame(2)
    corrupt(game)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game))

    expect(loadGame()).toEqual(createGame())
  })

  it('rejects non-finite numeric values in raw JSON', () => {
    const raw = JSON.stringify(createGame(2)).replace('"life":40', '"life":1e400')
    localStorage.setItem(STORAGE_KEY, raw)

    expect(loadGame()).toEqual(createGame())
  })
})
