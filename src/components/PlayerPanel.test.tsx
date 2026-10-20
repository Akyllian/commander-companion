import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createHistory, getGroupDelta, GROUP_WINDOW_MS, historyReducer } from '../game/history'
import { useReducer } from 'react'
import { canRemovePartner, createGame, gameReducer } from '../game/game'
import type { GameAction, GameState } from '../game/types'
import { PlayerPanel } from './PlayerPanel'

/** The real reducer and tap grouping behind every panel, like App without persistence. */
function Table({ initial, compact = false }: { initial: GameState; compact?: boolean }) {
  const [history, dispatchHistory] = useReducer(historyReducer, initial, createHistory)
  const dispatch = (action: GameAction) => dispatchHistory({ type: 'apply', action, at: Date.now() })
  const game = history.present
  const groupDelta = getGroupDelta(history)
  return (
    <>
      {game.players.map((player) => (
        <PlayerPanel
          key={player.id}
          player={player}
          opponents={game.players.filter((opponent) => opponent.id !== player.id)}
          playerCount={game.players.length}
          canRemovePartner={canRemovePartner(game, player.id)}
          delta={groupDelta?.target.playerId === player.id ? groupDelta : null}
          compact={compact}
          monarchPlayerId={game.monarchPlayerId}
          initiativePlayerId={game.initiativePlayerId}
          dispatch={dispatch}
        />
      ))}
    </>
  )
}

const panel = (name: string) => screen.getByRole('region', { name: `Segnapunti di ${name}` })
const modes = (name: string) => within(panel(name)).getByRole('group', { name: `Punteggio di ${name}` })
const mode = (name: string, label: RegExp) => within(modes(name)).getByRole('button', { name: label })
const press = (name: string, label: RegExp) => fireEvent.click(within(panel(name)).getByRole('button', { name: label }))
const lifeOf = (name: string) => within(panel(name)).getByTestId('life-total')

const partnerGame = () => gameReducer(createGame(3), { type: 'set-partner', playerId: 'player-2', hasPartner: true })

describe.each([
  ['standard', false],
  ['compact', true],
])('direct scoring dock (D-033, %s)', (_label, compact) => {
  it('offers every mode in order, starting on Vita', () => {
    render(<Table initial={createGame(2)} compact={compact} />)
    const buttons = within(modes('Giocatore 1')).getAllByRole('button')
    expect(buttons.map((button) => button.getAttribute('data-score-mode') ?? button.getAttribute('data-table-role'))).toEqual([
      'life',
      'commander',
      'poison',
      'energy',
      'experience',
      'rad',
      'tax',
      'monarch',
      'initiative',
    ])
    expect(mode('Giocatore 1', /^vita/i)).toHaveAttribute('aria-pressed', 'true')
    expect(mode('Giocatore 1', /^veleno/i)).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches mode in place without opening anything', () => {
    render(<Table initial={createGame(2)} compact={compact} />)
    fireEvent.click(mode('Giocatore 1', /^veleno/i))
    expect(mode('Giocatore 1', /^veleno/i)).toHaveAttribute('aria-pressed', 'true')
    expect(mode('Giocatore 1', /^vita/i)).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(panel('Giocatore 1').querySelector('details[open]')).toBeNull()
    // Life stays on screen in every mode.
    expect(lifeOf('Giocatore 1')).toHaveTextContent('40')
  })

  it('adjusts counters by one and keeps focus on the control used', () => {
    render(<Table initial={createGame(2)} compact={compact} />)
    for (const [label, name] of [
      [/^veleno/i, 'veleno'],
      [/^energia/i, 'energia'],
      [/^esperienza/i, 'esperienza'],
      [/^radiazioni/i, 'radiazioni'],
    ] as const) {
      fireEvent.click(mode('Giocatore 1', label))
      const up = within(panel('Giocatore 1')).getByRole('button', { name: `Aumenta ${name} di Giocatore 1` })
      up.focus()
      fireEvent.click(up)
      fireEvent.click(up)
      press('Giocatore 1', new RegExp(`^riduci ${name} di giocatore 1`, 'i'))
      expect(within(panel('Giocatore 1')).getByRole('status', { name: new RegExp(`${name} di giocatore 1`, 'i') })).toHaveTextContent('1')
      expect(up).toHaveFocus()
    }
  })

  it('records Commander damage per opponent and Partner slot, moving life with it', () => {
    render(<Table initial={partnerGame()} compact={compact} />)
    fireEvent.click(mode('Giocatore 1', /^commander/i))
    const sources = within(panel('Giocatore 1')).getByRole('group', { name: 'Fonte dei danni Commander a Giocatore 1' })
    const sourceNames = within(sources)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'))
    expect(sourceNames).toEqual([
      'Giocatore 2, Comandante 1: 0 danni',
      'Giocatore 2, Comandante 2: 0 danni',
      'Giocatore 3: 0 danni',
    ])
    expect(within(sources).getAllByRole('button')[0]).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(sources).getAllByRole('button')[1])
    press('Giocatore 1', /^aumenta danni commander da giocatore 2, comandante 2 a giocatore 1/i)
    press('Giocatore 1', /^aumenta danni commander da giocatore 2, comandante 2 a giocatore 1/i)
    expect(lifeOf('Giocatore 1')).toHaveTextContent('38')
    expect(within(sources).getAllByRole('button')[1]).toHaveAccessibleName('Giocatore 2, Comandante 2: 2 danni')
    expect(within(sources).getAllByRole('button')[0]).toHaveAccessibleName('Giocatore 2, Comandante 1: 0 danni')
    expect(mode('Giocatore 1', /^commander/i)).toHaveAccessibleName('Commander: massimo 2 su 21')
  })

  it('tracks Commander tax in steps of two mana, separately for each Partner', () => {
    render(<Table initial={partnerGame()} compact={compact} />)
    fireEvent.click(mode('Giocatore 2', /^tassa/i))
    press('Giocatore 2', /^aumenta di 2 mana la tassa del comandante 1 di giocatore 2/i)
    press('Giocatore 2', /^aumenta di 2 mana la tassa del comandante 1 di giocatore 2/i)
    expect(within(panel('Giocatore 2')).getByRole('status', { name: /tassa del comandante 1 di giocatore 2/i })).toHaveAccessibleName(
      'Tassa del Comandante 1 di Giocatore 2: più 4 mana',
    )

    const slots = within(panel('Giocatore 2')).getByRole('group', { name: 'Comandante della tassa di Giocatore 2' })
    fireEvent.click(within(slots).getByRole('button', { name: /^comandante 2/i }))
    press('Giocatore 2', /^aumenta di 2 mana la tassa del comandante 2 di giocatore 2/i)
    expect(within(panel('Giocatore 2')).getByRole('status', { name: /tassa del comandante 2/i })).toHaveAccessibleName(
      'Tassa del Comandante 2 di Giocatore 2: più 2 mana',
    )
    expect(lifeOf('Giocatore 2')).toHaveTextContent('40')
  })

  it('shows a single tax without a slot choice for a deck without Partner', () => {
    render(<Table initial={createGame(2)} compact={compact} />)
    fireEvent.click(mode('Giocatore 1', /^tassa/i))
    expect(within(panel('Giocatore 1')).queryByRole('group', { name: /comandante della tassa/i })).not.toBeInTheDocument()
    press('Giocatore 1', /^riduci di 2 mana la tassa del comandante 1 di giocatore 1/i)
    expect(within(panel('Giocatore 1')).getByRole('status', { name: /tassa del comandante 1/i })).toHaveAccessibleName(
      'Tassa del Comandante 1 di Giocatore 1: più 0 mana',
    )
  })

  it('remembers the mode and source of each panel independently', () => {
    render(<Table initial={partnerGame()} compact={compact} />)
    fireEvent.click(mode('Giocatore 1', /^commander/i))
    fireEvent.click(within(panel('Giocatore 1')).getByRole('button', { name: /^giocatore 3/i }))
    fireEvent.click(mode('Giocatore 1', /^veleno/i))
    fireEvent.click(mode('Giocatore 1', /^commander/i))
    expect(within(panel('Giocatore 1')).getByRole('button', { name: /^giocatore 3/i })).toHaveAttribute('aria-pressed', 'true')
    expect(mode('Giocatore 3', /^vita/i)).toHaveAttribute('aria-pressed', 'true')
  })

  it('transfers Monarch and Initiative between players and removes them from the owner', () => {
    render(<Table initial={createGame(3)} compact={compact} />)
    fireEvent.click(mode('Giocatore 1', /^monarca/i))
    expect(mode('Giocatore 1', /^monarca/i)).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(mode('Giocatore 2', /^monarca/i))
    expect(mode('Giocatore 2', /^monarca/i)).toHaveAttribute('aria-pressed', 'true')
    expect(mode('Giocatore 1', /^monarca/i)).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(mode('Giocatore 2', /^iniziativa/i))
    expect(mode('Giocatore 2', /^iniziativa/i)).toHaveAttribute('aria-pressed', 'true')
    expect(mode('Giocatore 2', /^monarca/i)).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(mode('Giocatore 2', /^monarca/i))
    expect(screen.getAllByRole('button', { name: /^monarca/i }).every((button) => button.getAttribute('aria-pressed') === 'false')).toBe(true)
    // Choosing a role never changes the selected scoring mode.
    expect(mode('Giocatore 2', /^vita/i)).toHaveAttribute('aria-pressed', 'true')
  })
})

it('keeps scoring out of the compact details sheet (D-033)', () => {
  render(<Table initial={createGame(3)} compact />)
  fireEvent.click(screen.getByRole('button', { name: 'Dettagli di Giocatore 1' }))
  const sheet = screen.getByRole('dialog', { name: 'Dettagli di Giocatore 1' })
  expect(within(sheet).queryByText('Danni Commander')).not.toBeInTheDocument()
  expect(within(sheet).queryByText('Altri segnalini')).not.toBeInTheDocument()
  expect(within(sheet).queryByRole('button', { name: /aumenta/i })).not.toBeInTheDocument()
  expect(within(sheet).getByText('Comandante e mazzo')).toBeInTheDocument()
  expect(within(sheet).getByRole('button', { name: /rimuovi giocatore/i })).toBeInTheDocument()
})

describe('settled announcement (D-036)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const live = (name: string) => panel(name).querySelector('.score-announcement') as HTMLElement
  /** Every text the live region takes while `run` executes (one entry per mutation batch). */
  const recordLive = async (name: string, run: () => void) => {
    const texts: string[] = []
    const observer = new MutationObserver(() => texts.push(live(name).textContent ?? ''))
    observer.observe(live(name), { childList: true, characterData: true, subtree: true })
    run()
    await act(async () => {
      vi.advanceTimersByTime(GROUP_WINDOW_MS * 2)
      await Promise.resolve()
    })
    observer.disconnect()
    return texts
  }

  it('keeps one polite region per panel, and silent dock outputs', () => {
    render(<Table initial={createGame(2)} />)
    fireEvent.click(mode('Giocatore 1', /^veleno/i))
    expect(panel('Giocatore 1').querySelectorAll('[aria-live="polite"]')).toHaveLength(1)
    expect(within(panel('Giocatore 1')).getByRole('status', { name: /veleno di giocatore 1/i })).toHaveAttribute('aria-live', 'off')
  })

  it('announces a counter burst once, after it settles', async () => {
    render(<Table initial={createGame(2)} />)
    fireEvent.click(mode('Giocatore 1', /^veleno/i))
    const texts = await recordLive('Giocatore 1', () => {
      for (let tap = 0; tap < 3; tap += 1) press('Giocatore 1', /^aumenta veleno di giocatore 1/i)
    })
    expect(texts).toEqual(['Giocatore 1: veleno 3'])
  })

  it('announces nothing after only changing mode', async () => {
    render(<Table initial={createGame(2)} />)
    const texts = await recordLive('Giocatore 1', () => {
      fireEvent.click(mode('Giocatore 1', /^veleno/i))
      fireEvent.click(mode('Giocatore 1', /^tassa/i))
      fireEvent.click(mode('Giocatore 1', /^commander/i))
    })
    expect(texts).toEqual([])
  })

  it('announces nothing after only changing source', async () => {
    render(<Table initial={createGame(3)} />)
    fireEvent.click(mode('Giocatore 1', /^commander/i))
    const texts = await recordLive('Giocatore 1', () => {
      fireEvent.click(within(panel('Giocatore 1')).getByRole('button', { name: /^giocatore 3/i }))
      fireEvent.click(within(panel('Giocatore 1')).getByRole('button', { name: /^giocatore 2/i }))
    })
    expect(texts).toEqual([])
  })

  it('makes a Commander burst one final announcement with damage and life', async () => {
    render(<Table initial={createGame(2)} />)
    fireEvent.click(mode('Giocatore 1', /^commander/i))
    const texts = await recordLive('Giocatore 1', () => {
      for (let tap = 0; tap < 3; tap += 1) press('Giocatore 1', /^aumenta danni commander da giocatore 2 a giocatore 1/i)
    })
    expect(texts).toEqual(['Giocatore 1: 3 danni Commander da Giocatore 2; vita 37'])
  })

  it('names a single point of damage, the Partner slot and the tax in mana', async () => {
    const partner = gameReducer(createGame(2), { type: 'set-partner', playerId: 'player-2', hasPartner: true })
    render(<Table initial={partner} />)
    fireEvent.click(mode('Giocatore 1', /^commander/i))
    fireEvent.click(within(panel('Giocatore 1')).getByRole('button', { name: /^giocatore 2, comandante 2/i }))
    const damage = await recordLive('Giocatore 1', () =>
      press('Giocatore 1', /^aumenta danni commander da giocatore 2, comandante 2 a giocatore 1/i),
    )
    expect(damage).toEqual(['Giocatore 1: 1 danno Commander da Giocatore 2, Comandante 2; vita 39'])

    fireEvent.click(mode('Giocatore 2', /^tassa/i))
    const tax = await recordLive('Giocatore 2', () => press('Giocatore 2', /^aumenta di 2 mana la tassa del comandante 1 di giocatore 2/i))
    expect(tax).toEqual(['Giocatore 2: tassa del Comandante 1, più 2 mana'])
  })

  it('announces a life burst as the settled life total', async () => {
    render(<Table initial={createGame(2)} />)
    const texts = await recordLive('Giocatore 1', () => press('Giocatore 1', /^aumenta di 1 la vita di giocatore 1/i))
    expect(texts).toEqual(['Giocatore 1: 41 punti vita'])
  })
})
