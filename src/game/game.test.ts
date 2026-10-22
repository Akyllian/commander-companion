import { canRemovePartner, carryDeckLinks, COMMANDER_DAMAGE_LIMIT, COUNTER_MAX, createGame, gameReducer, getDefeatReasons, isPlayerDefeated, LIFE_MAX, LIFE_MIN, normalizePlayerName, startGameWithLinks } from './game'
import type { GameAction, GameState } from './types'

const commanderHit = (
  state: GameState,
  target: number,
  source: number,
  amount: number,
  commander: 0 | 1 = 0,
): GameState =>
  gameReducer(state, {
    type: 'adjust-commander-damage',
    playerId: state.players[target].id,
    sourcePlayerId: state.players[source].id,
    commander,
    amount,
  })

describe('createGame', () => {
  it('creates between two and four players at 40 life', () => {
    expect(createGame(1).players).toHaveLength(2)
    expect(createGame(5).players).toHaveLength(4)
    expect(createGame(3).players.map((player) => player.life)).toEqual([40, 40, 40])
  })

  it('falls back to four players for a non-finite count', () => {
    expect(createGame(Number.NaN).players).toHaveLength(4)
  })

  it('starts every player without partner and without damage', () => {
    for (const player of createGame(4).players) {
      expect(player).toMatchObject({ poison: 0, energy: 0, experience: 0, hasPartner: false })
      expect(player.commanderDamage).toEqual({})
    }
  })
})

describe('life', () => {
  it('allows life below zero', () => {
    const initial = createGame(2)
    const next = gameReducer(initial, { type: 'adjust-life', playerId: 'player-1', amount: -45 })
    expect(next.players[0].life).toBe(-5)
  })

  it('clamps life to the domain bounds', () => {
    const initial = createGame(2)
    const up = gameReducer(initial, { type: 'adjust-life', playerId: 'player-1', amount: 2 * LIFE_MAX })
    const down = gameReducer(initial, { type: 'adjust-life', playerId: 'player-1', amount: -2 * LIFE_MAX })
    expect(up.players[0].life).toBe(LIFE_MAX)
    expect(down.players[0].life).toBe(LIFE_MIN)
  })

  it('returns the same state when a clamp makes the change ineffective', () => {
    const atMax = gameReducer(createGame(2), {
      type: 'adjust-life',
      playerId: 'player-1',
      amount: LIFE_MAX,
    })
    expect(gameReducer(atMax, { type: 'adjust-life', playerId: 'player-1', amount: 1 })).toBe(atMax)
  })
})

describe('input validation', () => {
  const initial = createGame(3)
  const invalidAmounts = [0, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 2]

  it.each(invalidAmounts)('ignores amount %s for every adjusting action', (amount) => {
    const actions: GameAction[] = [
      { type: 'adjust-life', playerId: 'player-1', amount },
      { type: 'adjust-counter', playerId: 'player-1', counter: 'poison', amount },
      {
        type: 'adjust-commander-damage',
        playerId: 'player-1',
        sourcePlayerId: 'player-2',
        commander: 0,
        amount,
      },
    ]
    for (const action of actions) expect(gameReducer(initial, action)).toBe(initial)
  })

  it('ignores unknown player ids', () => {
    const actions: GameAction[] = [
      { type: 'adjust-life', playerId: 'ghost', amount: 1 },
      { type: 'adjust-counter', playerId: 'ghost', counter: 'energy', amount: 1 },
      { type: 'rename-player', playerId: 'ghost', name: 'Boo' },
      { type: 'set-partner', playerId: 'ghost', hasPartner: true },
      { type: 'remove-player', playerId: 'ghost' },
      {
        type: 'adjust-commander-damage',
        playerId: 'ghost',
        sourcePlayerId: 'player-2',
        commander: 0,
        amount: 1,
      },
      {
        type: 'adjust-commander-damage',
        playerId: 'player-1',
        sourcePlayerId: 'ghost',
        commander: 0,
        amount: 1,
      },
    ]
    for (const action of actions) expect(gameReducer(initial, action)).toBe(initial)
  })

  it('ignores Commander damage dealt to oneself', () => {
    expect(commanderHit(initial, 0, 0, 5)).toBe(initial)
  })
})

describe('counters', () => {
  it('never lets a counter go below zero and records no change', () => {
    const initial = createGame(2)
    expect(
      gameReducer(initial, { type: 'adjust-counter', playerId: 'player-1', counter: 'poison', amount: -1 }),
    ).toBe(initial)
  })

  it('clamps counters to the domain maximum', () => {
    const next = gameReducer(createGame(2), {
      type: 'adjust-counter',
      playerId: 'player-1',
      counter: 'experience',
      amount: COUNTER_MAX + 10,
    })
    expect(next.players[0].experience).toBe(COUNTER_MAX)
  })

  it('detects defeat at exactly ten poison, not at nine', () => {
    const nine = gameReducer(createGame(2), {
      type: 'adjust-counter',
      playerId: 'player-1',
      counter: 'poison',
      amount: 9,
    })
    expect(isPlayerDefeated(nine.players[0])).toBe(false)
    const ten = gameReducer(nine, { type: 'adjust-counter', playerId: 'player-1', counter: 'poison', amount: 1 })
    expect(getDefeatReasons(ten.players[0])).toEqual(['poison'])
  })
})

describe('Commander damage (D-006: also changes life)', () => {
  it('records damage by source and subtracts the same life', () => {
    const next = commanderHit(createGame(3), 0, 1, 7)
    expect(next.players[0].commanderDamage['player-2']).toEqual([7, 0])
    expect(next.players[0].life).toBe(33)
  })

  it('restores life when damage is corrected downwards', () => {
    const hit = commanderHit(createGame(2), 0, 1, 7)
    const corrected = commanderHit(hit, 0, 1, -2)
    expect(corrected.players[0].commanderDamage['player-2']).toEqual([5, 0])
    expect(corrected.players[0].life).toBe(35)
  })

  it('never restores more life than the damage actually recorded', () => {
    const hit = commanderHit(createGame(2), 0, 1, 3)
    const overCorrected = commanderHit(hit, 0, 1, -10)
    expect(overCorrected.players[0].commanderDamage['player-2']).toEqual([0, 0])
    expect(overCorrected.players[0].life).toBe(40)
  })

  it('records no change when decrementing zero damage', () => {
    const initial = createGame(2)
    expect(commanderHit(initial, 0, 1, -1)).toBe(initial)
  })

  it('detects defeat at 21 damage from one commander', () => {
    const at20 = commanderHit(createGame(2), 0, 1, 20)
    expect(getDefeatReasons(at20.players[0])).toEqual([])
    const at21 = commanderHit(at20, 0, 1, 1)
    expect(at21.players[0].life).toBe(19)
    expect(getDefeatReasons(at21.players[0])).toEqual(['commander-damage'])
  })

  it('does not combine damage from different opponents', () => {
    const next = commanderHit(commanderHit(createGame(3), 0, 1, 20), 0, 2, 20)
    expect(next.players[0].life).toBe(0)
    expect(getDefeatReasons(next.players[0])).toEqual(['life'])
  })

  it('reports every simultaneous defeat reason', () => {
    let state = commanderHit(createGame(2), 0, 1, COMMANDER_DAMAGE_LIMIT)
    state = gameReducer(state, { type: 'adjust-life', playerId: 'player-1', amount: -30 })
    state = gameReducer(state, { type: 'adjust-counter', playerId: 'player-1', counter: 'poison', amount: 10 })
    expect(getDefeatReasons(state.players[0])).toEqual(['life', 'poison', 'commander-damage'])
  })

  it('keeps applied damage and life change consistent at the life floor', () => {
    const floored = gameReducer(createGame(2), {
      type: 'adjust-life',
      playerId: 'player-1',
      amount: LIFE_MIN - 40,
    })
    const hit = commanderHit(floored, 0, 1, 5)
    expect(hit.players[0].life).toBe(LIFE_MIN)
    expect(hit.players[0].commanderDamage['player-2']).toEqual([5, 0])
  })
})

describe('partner commanders (D-007)', () => {
  const withPartner = gameReducer(createGame(3), {
    type: 'set-partner',
    playerId: 'player-2',
    hasPartner: true,
  })

  it('ignores partner damage when the source has no partner', () => {
    const initial = createGame(2)
    expect(commanderHit(initial, 0, 1, 5, 1)).toBe(initial)
  })

  it('tracks each partner commander separately', () => {
    const next = commanderHit(commanderHit(withPartner, 0, 1, 11, 0), 0, 1, 10, 1)
    expect(next.players[0].commanderDamage['player-2']).toEqual([11, 10])
    expect(next.players[0].life).toBe(19)
    expect(isPlayerDefeated(next.players[0])).toBe(false)
  })

  it('detects 21 damage from the partner commander alone', () => {
    const next = commanderHit(withPartner, 0, 1, 21, 1)
    expect(getDefeatReasons(next.players[0])).toEqual(['commander-damage'])
  })

  it('records no change when setting the current partner flag again', () => {
    expect(
      gameReducer(withPartner, { type: 'set-partner', playerId: 'player-2', hasPartner: true }),
    ).toBe(withPartner)
  })

  it('removes the partner only while nobody has damage from it', () => {
    expect(canRemovePartner(withPartner, 'player-2')).toBe(true)
    const removed = gameReducer(withPartner, { type: 'set-partner', playerId: 'player-2', hasPartner: false })
    expect(removed.players[1].hasPartner).toBe(false)

    const damaged = commanderHit(withPartner, 0, 1, 3, 1)
    expect(canRemovePartner(damaged, 'player-2')).toBe(false)
    expect(
      gameReducer(damaged, { type: 'set-partner', playerId: 'player-2', hasPartner: false }),
    ).toBe(damaged)
  })

  it('allows removing the partner once its damage is corrected to zero', () => {
    const corrected = commanderHit(commanderHit(withPartner, 0, 1, 3, 1), 0, 1, -3, 1)
    expect(canRemovePartner(corrected, 'player-2')).toBe(true)
  })

  it('reports false for unknown players', () => {
    expect(canRemovePartner(withPartner, 'ghost')).toBe(false)
  })
})

describe('names', () => {
  it('trims and limits names to 28 characters', () => {
    const next = gameReducer(createGame(2), {
      type: 'rename-player',
      playerId: 'player-1',
      name: `   ${'a'.repeat(40)}   `,
    })
    expect(next.players[0].name).toBe('a'.repeat(28))
  })

  it('keeps the previous name when the new one is blank or unchanged', () => {
    const initial = createGame(2)
    expect(gameReducer(initial, { type: 'rename-player', playerId: 'player-1', name: '   ' })).toBe(initial)
    expect(
      gameReducer(initial, { type: 'rename-player', playerId: 'player-1', name: ' Giocatore 1 ' }),
    ).toBe(initial)
  })

  it('never splits an emoji when truncating', () => {
    const name = normalizePlayerName(`${'a'.repeat(27)}🐉🐉`)
    expect(Array.from(name)).toHaveLength(28)
    expect(name.endsWith('🐉')).toBe(true)
  })
})

describe('reset and removal', () => {
  it('resets counters but preserves identity and partner configuration', () => {
    let state = gameReducer(createGame(2), { type: 'rename-player', playerId: 'player-1', name: 'Liliana' })
    state = gameReducer(state, { type: 'set-partner', playerId: 'player-1', hasPartner: true })
    state = commanderHit(state, 0, 1, 12)
    const reset = gameReducer(state, { type: 'reset-game' })

    expect(reset.players[0]).toMatchObject({
      id: 'player-1',
      name: 'Liliana',
      life: 40,
      poison: 0,
      energy: 0,
      experience: 0,
      hasPartner: true,
      commanderDamage: {},
    })
  })

  it('removes Commander damage references when a player leaves', () => {
    const damaged = commanderHit(createGame(3), 0, 2, 8)
    const next = gameReducer(damaged, { type: 'remove-player', playerId: 'player-3' })

    expect(next.players).toHaveLength(2)
    expect(next.players[0].commanderDamage['player-3']).toBeUndefined()
    // Life lost to that commander stays lost: the damage happened.
    expect(next.players[0].life).toBe(32)
  })

  it('never goes below two players', () => {
    const initial = createGame(2)
    expect(gameReducer(initial, { type: 'remove-player', playerId: 'player-1' })).toBe(initial)
  })
})

describe('commander art (Phase 2c, D-026/D-027)', () => {
  const zimone = {
    cardId: 'ca09bb5f-feab-4754-ac6b-3f06327d3fe9',
    name: 'Zimone, All-Questioning',
    artist: 'Ekaterina Burmak',
  }
  const dina = { cardId: '0f6d9a0e-1111-4c55-9d1e-2c4b4a6b7c8d', name: 'Dina, Soul Steeper', artist: 'Someone' }
  const setCommander = (state: GameState, commander: typeof zimone | null, slot: 0 | 1 = 0, playerId = 'player-1') =>
    gameReducer(state, { type: 'set-commander', playerId, slot, commander })
  const withPartner = (state: GameState) => gameReducer(state, { type: 'set-partner', playerId: 'player-1', hasPartner: true })

  it('starts every player with two empty commander slots', () => {
    expect(createGame(2).players.map((player) => player.commanders)).toEqual([
      [null, null],
      [null, null],
    ])
  })

  it('sets, keeps through reset and clears the first commander', () => {
    const set = setCommander(createGame(2), zimone)
    expect(set.players[0].commanders).toEqual([zimone, null])
    expect(gameReducer(set, { type: 'reset-game' }).players[0].commanders).toEqual([zimone, null])
    expect(setCommander(set, null).players[0].commanders).toEqual([null, null])
  })

  it('accepts a second commander only for partner decks', () => {
    const initial = createGame(2)
    expect(setCommander(initial, dina, 1)).toBe(initial)
    const both = setCommander(setCommander(withPartner(initial), zimone), dina, 1)
    expect(both.players[0].commanders).toEqual([zimone, dina])
  })

  it('drops the second commander when the partner is removed', () => {
    const both = setCommander(setCommander(withPartner(createGame(2)), zimone), dina, 1)
    const single = gameReducer(both, { type: 'set-partner', playerId: 'player-1', hasPartner: false })
    expect(single.players[0]).toMatchObject({ hasPartner: false, commanders: [zimone, null] })
  })

  it('trims text and records no change for the same commander', () => {
    const set = setCommander(createGame(2), { ...zimone, name: `  ${zimone.name}  ` })
    expect(set.players[0].commanders[0]?.name).toBe(zimone.name)
    expect(setCommander(set, zimone)).toBe(set)
    const initial = createGame(2)
    expect(setCommander(initial, null)).toBe(initial)
  })

  it.each([
    ['a malformed card id', { ...zimone, cardId: 'not-a-uuid' }],
    ['an empty name', { ...zimone, name: '   ' }],
    ['an empty artist', { ...zimone, artist: '' }],
    ['an overlong name', { ...zimone, name: 'x'.repeat(201) }],
  ])('ignores %s', (_label, commander) => {
    const initial = createGame(2)
    expect(setCommander(initial, commander)).toBe(initial)
  })

  it('ignores unknown players', () => {
    const initial = createGame(2)
    expect(setCommander(initial, zimone, 0, 'ghost')).toBe(initial)
  })
})

describe('frequent scores (D-033)', () => {
  const tax = (state: GameState, player: number, amount: number, commander: 0 | 1 = 0): GameState =>
    gameReducer(state, { type: 'adjust-commander-tax', playerId: state.players[player].id, commander, amount })
  const role = (state: GameState, which: 'monarch' | 'initiative', playerId: string | null): GameState =>
    gameReducer(state, { type: 'set-table-role', role: which, playerId })
  const withPartner = gameReducer(createGame(3), { type: 'set-partner', playerId: 'player-1', hasPartner: true })

  it('starts every player at zero rad and tax, with no Monarch or Initiative', () => {
    const game = createGame(4)
    expect(game.players.every((player) => player.rad === 0)).toBe(true)
    expect(game.players.every((player) => player.commanderTax[0] === 0 && player.commanderTax[1] === 0)).toBe(true)
    expect(game.monarchPlayerId).toBeNull()
    expect(game.initiativePlayerId).toBeNull()
  })

  it('tracks rad as a nonnegative counter', () => {
    const initial = createGame(2)
    expect(gameReducer(initial, { type: 'adjust-counter', playerId: 'player-1', counter: 'rad', amount: -1 })).toBe(initial)
    const next = gameReducer(initial, { type: 'adjust-counter', playerId: 'player-1', counter: 'rad', amount: 3 })
    expect(next.players[0].rad).toBe(3)
    expect(getDefeatReasons(next.players[0])).toEqual([])
  })

  it('changes Commander tax only in steps of two and never below zero', () => {
    const initial = createGame(2)
    expect(tax(initial, 0, -2)).toBe(initial)
    expect(tax(initial, 0, 1)).toBe(initial)
    expect(tax(initial, 0, 3)).toBe(initial)
    expect(tax(initial, 0, 0)).toBe(initial)
    expect(tax(initial, 0, Number.NaN)).toBe(initial)
    const twice = tax(tax(initial, 0, 2), 0, 2)
    expect(twice.players[0].commanderTax).toEqual([4, 0])
    expect(tax(twice, 0, -6).players[0].commanderTax).toEqual([0, 0])
  })

  it('clamps Commander tax to an even maximum', () => {
    const next = tax(createGame(2), 0, COUNTER_MAX * 4)
    expect(next.players[0].commanderTax[0]).toBe(COUNTER_MAX - 1)
    expect(next.players[0].commanderTax[0] % 2).toBe(0)
  })

  it('keeps the two Partner taxes distinct and ignores the second slot without Partner', () => {
    const initial = createGame(2)
    expect(tax(initial, 0, 2, 1)).toBe(initial)
    const next = tax(tax(withPartner, 0, 2, 0), 0, 4, 1)
    expect(next.players[0].commanderTax).toEqual([2, 4])
  })

  it('ignores tax for unknown players', () => {
    const initial = createGame(2)
    expect(gameReducer(initial, { type: 'adjust-commander-tax', playerId: 'ghost', commander: 0, amount: 2 })).toBe(initial)
  })

  it('keeps the Partner while its Commander tax is nonzero', () => {
    const taxed = tax(withPartner, 0, 2, 1)
    expect(canRemovePartner(taxed, 'player-1')).toBe(false)
    expect(gameReducer(taxed, { type: 'set-partner', playerId: 'player-1', hasPartner: false })).toBe(taxed)
    const cleared = tax(taxed, 0, -2, 1)
    expect(canRemovePartner(cleared, 'player-1')).toBe(true)
  })

  it('gives Monarch and Initiative to one player at a time', () => {
    const initial = createGame(3)
    const crowned = role(initial, 'monarch', 'player-2')
    expect(crowned.monarchPlayerId).toBe('player-2')
    expect(role(crowned, 'monarch', 'player-2')).toBe(crowned)
    expect(role(crowned, 'monarch', 'player-3').monarchPlayerId).toBe('player-3')
    expect(role(crowned, 'monarch', null).monarchPlayerId).toBeNull()
    expect(role(initial, 'monarch', null)).toBe(initial)
  })

  it('lets the same player hold both table roles', () => {
    const both = role(role(createGame(2), 'monarch', 'player-1'), 'initiative', 'player-1')
    expect(both.monarchPlayerId).toBe('player-1')
    expect(both.initiativePlayerId).toBe('player-1')
  })

  it('ignores table roles for unknown players', () => {
    const initial = createGame(2)
    expect(role(initial, 'initiative', 'ghost')).toBe(initial)
  })

  it('resets rad, tax and table roles but keeps identity and Partner', () => {
    let state = tax(withPartner, 0, 4, 1)
    state = gameReducer(state, { type: 'adjust-counter', playerId: 'player-2', counter: 'rad', amount: 5 })
    state = role(role(state, 'monarch', 'player-2'), 'initiative', 'player-3')
    const reset = gameReducer(state, { type: 'reset-game' })
    expect(reset.players.map((player) => [player.rad, ...player.commanderTax])).toEqual([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ])
    expect(reset.monarchPlayerId).toBeNull()
    expect(reset.initiativePlayerId).toBeNull()
    expect(reset.players[0].hasPartner).toBe(true)
  })

  it('clears the table roles of a removed player only', () => {
    let state = role(role(createGame(3), 'monarch', 'player-2'), 'initiative', 'player-3')
    state = gameReducer(state, { type: 'remove-player', playerId: 'player-2' })
    expect(state.monarchPlayerId).toBeNull()
    expect(state.initiativePlayerId).toBe('player-3')
  })
})

describe('deck links (R3, schema v6)', () => {
  const art = (n: number) => ({ cardId: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, name: `Comandante ${n}`, artist: `Artista ${n}` })
  const link = (state: GameState, playerId = 'player-1', hasPartner = false) =>
    gameReducer(state, { type: 'link-deck', playerId, deckId: 'deck-a', commanders: [art(1), hasPartner ? art(2) : null], hasPartner })

  it('starts every player without a deck', () => {
    expect(createGame(4).players.every((player) => player.deck === null)).toBe(true)
  })

  it('applies the deck’s commanders, never the name or the scores', () => {
    let game = gameReducer(createGame(2), { type: 'adjust-life', playerId: 'player-1', amount: -5 })
    game = gameReducer(game, { type: 'rename-player', playerId: 'player-1', name: 'Giulia' })
    const linked = link(game)
    expect(linked.players[0]).toMatchObject({ name: 'Giulia', life: 35, commanders: [art(1), null], hasPartner: false, deck: { deckId: 'deck-a', overridden: false } })
    expect(link(linked)).toBe(linked)
  })

  it('applies a Partner deck to both slots', () => {
    expect(link(createGame(2), 'player-1', true).players[0]).toMatchObject({ hasPartner: true, commanders: [art(1), art(2)] })
  })

  it('refuses an unknown player or an invalid commander', () => {
    const game = createGame(2)
    expect(gameReducer(game, { type: 'link-deck', playerId: 'nobody', deckId: 'd', commanders: [art(1), null], hasPartner: false })).toBe(game)
    expect(gameReducer(game, { type: 'link-deck', playerId: 'player-1', deckId: '', commanders: [art(1), null], hasPartner: false })).toBe(game)
    expect(gameReducer(game, { type: 'link-deck', playerId: 'player-1', deckId: 'd', commanders: [{ ...art(1), cardId: 'x' }, null], hasPartner: false })).toBe(game)
  })

  it('keeps Partner when it cannot be removed (damage or tax from Comandante 2)', () => {
    let game = link(createGame(2), 'player-1', true)
    game = gameReducer(game, { type: 'adjust-commander-tax', playerId: 'player-1', commander: 1, amount: 2 })
    const relinked = gameReducer(game, { type: 'link-deck', playerId: 'player-1', deckId: 'deck-b', commanders: [art(3), null], hasPartner: false })
    expect(relinked).toBe(game)
  })

  it('marks a manual commander or Partner change on a linked player as an override for this match', () => {
    const linked = link(createGame(2))
    const changed = gameReducer(linked, { type: 'set-commander', playerId: 'player-1', slot: 0, commander: art(5) })
    expect(changed.players[0].deck).toEqual({ deckId: 'deck-a', overridden: true })
    const partner = gameReducer(linked, { type: 'set-partner', playerId: 'player-1', hasPartner: true })
    expect(partner.players[0].deck).toEqual({ deckId: 'deck-a', overridden: true })
    // Unlinked players have nothing to override.
    expect(gameReducer(createGame(2), { type: 'set-commander', playerId: 'player-1', slot: 0, commander: art(5) }).players[0].deck).toBeNull()
  })

  it('re-applying the deck clears the override', () => {
    const changed = gameReducer(link(createGame(2)), { type: 'set-commander', playerId: 'player-1', slot: 0, commander: art(5) })
    expect(link(changed).players[0]).toMatchObject({ commanders: [art(1), null], deck: { deckId: 'deck-a', overridden: false } })
  })

  it('unlinks keeping or removing the applied commander', () => {
    const linked = link(createGame(2), 'player-1', true)
    expect(gameReducer(linked, { type: 'unlink-deck', playerId: 'player-1', keepCommander: true }).players[0]).toMatchObject({ deck: null, commanders: [art(1), art(2)] })
    expect(gameReducer(linked, { type: 'unlink-deck', playerId: 'player-1', keepCommander: false }).players[0]).toMatchObject({ deck: null, commanders: [null, null] })
    const plain = createGame(2)
    expect(gameReducer(plain, { type: 'unlink-deck', playerId: 'player-1', keepCommander: false })).toBe(plain)
  })

  it('keeps links through a score reset, and drops them with the removed player (Review Focus 2)', () => {
    const linked = link(link(createGame(3)), 'player-3')
    expect(gameReducer(linked, { type: 'reset-game' }).players.map((player) => player.deck?.deckId ?? null)).toEqual(['deck-a', null, 'deck-a'])
    const removed = gameReducer(linked, { type: 'remove-player', playerId: 'player-3' })
    expect(removed.players.map((player) => player.deck?.deckId ?? null)).toEqual(['deck-a', null])
  })

  it('carries links to the same seats of a new game, dropping seats that are gone', () => {
    const previous = link(link(createGame(4)), 'player-4')
    const next = carryDeckLinks(previous, createGame(2))
    expect(next.players.map((player) => player.deck)).toEqual([{ deckId: 'deck-a', overridden: false }, null])
    const unchanged = createGame(2)
    expect(carryDeckLinks(createGame(2), unchanged)).toBe(unchanged)
  })

  it('starts a new game with resolved links in one state (fix 3)', () => {
    let previous = link(createGame(3))
    previous = gameReducer(previous, { type: 'link-deck', playerId: 'player-2', deckId: 'deck-gone', commanders: [art(7), null], hasPartner: false })
    previous = gameReducer(previous, { type: 'adjust-life', playerId: 'player-1', amount: -10 })
    previous = gameReducer(previous, { type: 'set-commander', playerId: 'player-1', slot: 0, commander: art(9) })
    const decks = new Map([
      ['deck-a', { commanders: [art(1), art(2)] as [ReturnType<typeof art>, ReturnType<typeof art> | null], hasPartner: true }],
      ['deck-gone', null],
    ])
    const next = startGameWithLinks(previous, 3, decks)
    // The current deck is applied afresh, the override cleared; life starts over.
    expect(next.players[0]).toMatchObject({ life: 40, hasPartner: true, commanders: [art(1), art(2)], deck: { deckId: 'deck-a', overridden: false } })
    // A deleted deck keeps the commander already applied, and its link («Mazzo non disponibile»).
    expect(next.players[1]).toMatchObject({ commanders: [art(7), null], deck: { deckId: 'deck-gone', overridden: false } })
    expect(next.players[2]).toMatchObject({ commanders: [null, null], deck: null })
  })

  it('treats a link missing from the resolved map like a deleted deck', () => {
    const previous = link(createGame(2))
    expect(startGameWithLinks(previous, 2, new Map()).players[0]).toMatchObject({ commanders: [art(1), null], deck: { deckId: 'deck-a' } })
  })
})
