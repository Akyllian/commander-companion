import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { useReducer, useState } from 'react'
import { canRemovePartner, createGame, gameReducer } from '../game/game'
import { createHistory, getGroupDelta, GROUP_WINDOW_MS, historyReducer } from '../game/history'
import type { GameAction, GameState } from '../game/types'
import type { RandomArt } from '../match/presentation'
import { setArtStoreForTests } from '../media/artStore'
import { PlayerPanel } from './PlayerPanel'

type Open = { playerId: string; kind: 'counters' | 'commander' } | null

/** The real reducer, tap grouping and one open surface, like App without persistence. */
function Table({ initial, compact = false, randomArt = {} }: { initial: GameState; compact?: boolean; randomArt?: Record<string, RandomArt> }) {
  const [history, dispatchHistory] = useReducer(historyReducer, initial, createHistory)
  const [open, setOpen] = useState<Open>(null)
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
          randomArt={randomArt[player.id] ?? null}
          openSurface={open?.playerId === player.id ? open.kind : null}
          onOpenSurface={(kind) => setOpen({ playerId: player.id, kind })}
          onCloseSurface={() => setOpen(null)}
          dispatch={dispatch}
        />
      ))}
    </>
  )
}

const panel = (name: string) => screen.getByRole('region', { name: `Segnapunti di ${name}` })
const button = (name: string, label: string | RegExp) => within(panel(name)).getByRole('button', { name: label })
const press = (name: string, label: string | RegExp) => fireEvent.click(button(name, label), { detail: 1 })
const lifeOf = (name: string) => within(panel(name)).getByTestId('life-total')

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const commander = (n: number) => ({ cardId: id(n), name: `Comandante ${n}`, artist: `Artista ${n}` })
const randomCard: RandomArt = { cardId: id(50), name: 'Carta casuale', artist: 'Rebecca Guay' }

afterEach(() => setArtStoreForTests(undefined))

describe.each([
  ['standard', false],
  ['compact', true],
])('closed player card (R2 §3, %s)', (_label, compact) => {
  it('passes the Monarch with the crown and shows who holds it', () => {
    render(<Table initial={createGame(2)} compact={compact} />)
    press('Giocatore 1', 'Prendi Monarca')
    expect(button('Giocatore 1', 'Rilascia Monarca')).toHaveAttribute('aria-pressed', 'true')
    press('Giocatore 2', 'Prendi Monarca')
    expect(button('Giocatore 1', 'Prendi Monarca')).toHaveAttribute('aria-pressed', 'false')
    press('Giocatore 2', 'Rilascia Monarca')
    expect(button('Giocatore 2', 'Prendi Monarca')).toBeInTheDocument()
  })

  it('shows the name as text, the commander line and the details trigger', () => {
    render(<Table initial={createGame(2)} compact={compact} randomArt={{ 'player-1': randomCard }} />)
    expect(within(panel('Giocatore 1')).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(panel('Giocatore 1')).getByText('Giocatore 1')).toHaveClass('player-name')
    // A random illustration is never presented as the commander (spec §14).
    expect(within(panel('Giocatore 1')).getByText('Comandante non scelto')).toBeInTheDocument()
    expect(within(panel('Giocatore 1')).queryByText('Carta casuale')).not.toBeInTheDocument()
    expect(button('Giocatore 1', 'Apri dettagli di Giocatore 1')).toBeInTheDocument()
  })

  it('names both Partner commanders', () => {
    let game = gameReducer(createGame(2), { type: 'set-partner', playerId: 'player-1', hasPartner: true })
    game = gameReducer(game, { type: 'set-commander', playerId: 'player-1', slot: 0, commander: commander(1) })
    game = gameReducer(game, { type: 'set-commander', playerId: 'player-1', slot: 1, commander: commander(2) })
    render(<Table initial={game} compact={compact} />)
    expect(within(panel('Giocatore 1')).getByText('Comandante 1 + Comandante 2')).toBeInTheDocument()
  })

  it('moves life by one only, with the cumulative delta beside it', () => {
    render(<Table initial={createGame(2)} compact={compact} />)
    const lifeButtons = within(within(panel('Giocatore 1')).getByRole('group', { name: 'Punti vita di Giocatore 1' })).getAllByRole('button')
    expect(lifeButtons.map((control) => control.getAttribute('aria-label'))).toEqual([
      'Riduci di 1 la vita di Giocatore 1',
      'Aumenta di 1 la vita di Giocatore 1',
    ])
    expect(within(panel('Giocatore 1')).queryByRole('button', { name: /di 5/ })).not.toBeInTheDocument()
    press('Giocatore 1', 'Riduci di 1 la vita di Giocatore 1')
    press('Giocatore 1', 'Riduci di 1 la vita di Giocatore 1')
    expect(lifeOf('Giocatore 1')).toHaveTextContent('38')
    expect(within(panel('Giocatore 1')).getByTestId('delta-badge')).toHaveTextContent('−2')
  })

  it('keeps every counter off the closed card and opens Contatori and Danni Commander inside it', () => {
    render(<Table initial={createGame(2)} compact={compact} />)
    expect(within(panel('Giocatore 1')).queryByText('Veleno')).not.toBeInTheDocument()
    expect(within(panel('Giocatore 1')).queryByRole('radiogroup')).not.toBeInTheDocument()
    const counters = button('Giocatore 1', 'Contatori')
    expect(counters).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(counters)
    expect(within(panel('Giocatore 1')).getByRole('group', { name: 'Contatori' })).toBeInTheDocument()
    expect(button('Giocatore 1', 'Contatori')).toHaveAttribute('aria-expanded', 'true')

    const diamond = button('Giocatore 1', 'Danni Commander di Giocatore 1')
    expect(diamond.textContent).not.toMatch(/\d/)
    fireEvent.click(diamond)
    // One surface at a time: the Commander panel replaced the drawer.
    expect(within(panel('Giocatore 1')).queryByRole('group', { name: 'Contatori' })).not.toBeInTheDocument()
    expect(within(panel('Giocatore 1')).getByRole('radiogroup', { name: 'Sorgente dei danni Commander' })).toBeInTheDocument()
    fireEvent.click(button('Giocatore 1', 'Chiudi danni Commander'))
    expect(within(panel('Giocatore 1')).queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('marks a player out of the game for every tracked cause, and clears it after a correction', () => {
    let game = createGame(2)
    game = gameReducer(game, { type: 'adjust-life', playerId: 'player-1', amount: -40 })
    render(<Table initial={game} compact={compact} />)
    expect(within(panel('Giocatore 1')).getByText('Fuori dalla partita')).toBeInTheDocument()
    expect(panel('Giocatore 1')).toHaveAttribute('data-out')
    press('Giocatore 1', 'Aumenta di 1 la vita di Giocatore 1')
    expect(within(panel('Giocatore 1')).queryByText('Fuori dalla partita')).not.toBeInTheDocument()
    expect(panel('Giocatore 1')).not.toHaveAttribute('data-out')
  })
})

describe('card art (R2 §4)', () => {
  it('uses the neutral texture without any art, and credits a random illustration on the standard card', async () => {
    setArtStoreForTests({
      get: async (cardId) => (cardId === randomCard.cardId ? { bytes: new ArrayBuffer(1), type: 'image/jpeg', veil: { name: 0, life: 0 } } : undefined),
      put: async () => undefined,
      delete: async () => undefined,
      keys: async () => [],
    })
    render(<Table initial={createGame(2)} randomArt={{ 'player-1': randomCard }} />)
    await act(async () => undefined)
    expect(panel('Giocatore 2')).toHaveAttribute('data-art', 'neutral')
    expect(within(panel('Giocatore 1')).getByText('Illustrazione di Rebecca Guay')).toBeInTheDocument()
  })

  it('keeps the credit in Dettagli only on compact cards', () => {
    render(<Table initial={createGame(2)} compact randomArt={{ 'player-1': randomCard }} />)
    expect(within(panel('Giocatore 1')).queryByText('Illustrazione di Rebecca Guay')).not.toBeInTheDocument()
  })

  it('prefers the commander art over the random one', () => {
    const game = gameReducer(createGame(2), { type: 'set-commander', playerId: 'player-1', slot: 0, commander: commander(1) })
    render(<Table initial={game} randomArt={{ 'player-1': randomCard }} />)
    expect(within(panel('Giocatore 1')).getByText('Comandante 1')).toBeInTheDocument()
    expect(within(panel('Giocatore 1')).queryByText('Illustrazione di Rebecca Guay')).not.toBeInTheDocument()
  })

  it('shows a cached random art and its full credit in Dettagli', async () => {
    setArtStoreForTests({
      get: async () => ({ bytes: new ArrayBuffer(1), type: 'image/jpeg', veil: { name: 0, life: 0 } }),
      put: async () => undefined,
      delete: async () => undefined,
      keys: async () => [],
    })
    render(<Table initial={createGame(2)} randomArt={{ 'player-1': randomCard }} />)
    await act(async () => undefined)
    expect(panel('Giocatore 1')).toHaveAttribute('data-art', 'random')
    fireEvent.click(button('Giocatore 1', 'Apri dettagli di Giocatore 1'))
    const sheet = screen.getByRole('dialog', { name: 'Dettagli di Giocatore 1' })
    expect(within(sheet).getByText('Arte casuale')).toBeInTheDocument()
    expect(within(sheet).getByText('Carta casuale')).toBeInTheDocument()
    expect(within(sheet).getByText('Illustrazione di Rebecca Guay')).toBeInTheDocument()
  })

  it('says in Dettagli when the illustration is not available offline', async () => {
    setArtStoreForTests({ get: async () => undefined, put: async () => undefined, delete: async () => undefined, keys: async () => [] })
    render(<Table initial={createGame(2)} randomArt={{ 'player-1': randomCard }} />)
    await act(async () => undefined)
    expect(panel('Giocatore 1')).toHaveAttribute('data-art', 'neutral')
    fireEvent.click(button('Giocatore 1', 'Apri dettagli di Giocatore 1'))
    expect(within(screen.getByRole('dialog')).getByText('Illustrazione non disponibile offline')).toBeInTheDocument()
  })
})

describe('Dettagli (R2 §4.3)', () => {
  it('holds the name, the deck, every defeat cause and removal from three players up', () => {
    let game = createGame(3)
    game = gameReducer(game, { type: 'adjust-life', playerId: 'player-1', amount: -40 })
    game = gameReducer(game, { type: 'adjust-counter', playerId: 'player-1', counter: 'poison', amount: 10 })
    render(<Table initial={game} />)
    fireEvent.click(button('Giocatore 1', 'Apri dettagli di Giocatore 1'))
    const sheet = screen.getByRole('dialog', { name: 'Dettagli di Giocatore 1' })
    expect(within(sheet).getByText('punti vita a zero o meno')).toBeInTheDocument()
    expect(within(sheet).getByText('10 segnalini veleno')).toBeInTheDocument()
    expect(within(sheet).getByText('Comandante e mazzo')).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: /rimuovi giocatore/i })).toBeInTheDocument()

    const input = within(sheet).getByRole('textbox', { name: 'Nome giocatore' })
    fireEvent.change(input, { target: { value: 'Giulia' } })
    fireEvent.blur(input)
    expect(panel('Giulia')).toBeInTheDocument()
  })

  it('restores the name on Escape and blurs on Enter', () => {
    render(<Table initial={createGame(2)} />)
    fireEvent.click(button('Giocatore 1', 'Apri dettagli di Giocatore 1'))
    const input = within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Nome giocatore' })
    input.focus()
    fireEvent.change(input, { target: { value: 'Marco' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input).toHaveValue('Giocatore 1')
    input.focus()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input).not.toHaveFocus()
  })

  it('offers no removal with two players', () => {
    render(<Table initial={createGame(2)} />)
    fireEvent.click(button('Giocatore 1', 'Apri dettagli di Giocatore 1'))
    expect(within(screen.getByRole('dialog')).queryByRole('button', { name: /rimuovi giocatore/i })).not.toBeInTheDocument()
  })
})

describe('settled announcement (D-036)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const live = (name: string) => panel(name).querySelector('.score-announcement') as HTMLElement
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

  it('keeps one polite region per card, also with a panel open', () => {
    render(<Table initial={createGame(2)} />)
    fireEvent.click(button('Giocatore 1', 'Contatori'))
    expect(panel('Giocatore 1').querySelectorAll('[aria-live="polite"]')).toHaveLength(1)
  })

  it('announces a counter burst once, after it settles', async () => {
    render(<Table initial={createGame(2)} />)
    fireEvent.click(button('Giocatore 1', 'Contatori'))
    const texts = await recordLive('Giocatore 1', () => {
      for (let tap = 0; tap < 3; tap += 1) press('Giocatore 1', 'Aggiungi 1 al veleno di Giocatore 1')
    })
    expect(texts).toEqual(['Giocatore 1: veleno 3'])
  })

  it('announces nothing after only opening panels or changing source', async () => {
    render(<Table initial={createGame(3)} />)
    const texts = await recordLive('Giocatore 1', () => {
      fireEvent.click(button('Giocatore 1', 'Contatori'))
      fireEvent.click(button('Giocatore 1', 'Danni Commander di Giocatore 1'))
      fireEvent.click(within(panel('Giocatore 1')).getByRole('radio', { name: 'Giocatore 3 · Comandante' }))
    })
    expect(texts).toEqual([])
  })

  it('makes a Commander burst one announcement with source, Partner slot and life', async () => {
    const partner = gameReducer(createGame(2), { type: 'set-partner', playerId: 'player-2', hasPartner: true })
    render(<Table initial={partner} />)
    fireEvent.click(button('Giocatore 1', 'Danni Commander di Giocatore 1'))
    fireEvent.click(within(panel('Giocatore 1')).getByRole('radio', { name: 'Giocatore 2 · Comandante 2' }))
    const texts = await recordLive('Giocatore 1', () => {
      for (let tap = 0; tap < 2; tap += 1) press('Giocatore 1', 'Aggiungi 1 danno Commander da Giocatore 2, Comandante 2 a Giocatore 1')
    })
    expect(texts).toEqual(['Giocatore 1: 2 danni Commander da Giocatore 2, Comandante 2; vita 38'])
  })

  it('announces a life burst as the settled life total', async () => {
    render(<Table initial={createGame(2)} />)
    const texts = await recordLive('Giocatore 1', () => press('Giocatore 1', 'Aumenta di 1 la vita di Giocatore 1'))
    expect(texts).toEqual(['Giocatore 1: 41 punti vita'])
  })
})
