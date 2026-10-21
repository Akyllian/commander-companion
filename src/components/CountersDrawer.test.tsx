import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { useReducer, useState } from 'react'
import { createGame, gameReducer } from '../game/game'
import { createHistory, getGroupDelta, historyReducer } from '../game/history'
import type { GameAction, GameState } from '../game/types'
import { CountersDrawer } from './CountersDrawer'

/** One player's drawer over the real reducer and tap grouping. */
function Harness({ initial, playerIndex = 0 }: { initial: GameState; playerIndex?: number }) {
  const [history, dispatchHistory] = useReducer(historyReducer, initial, createHistory)
  const [open, setOpen] = useState(true)
  const dispatch = (action: GameAction) => dispatchHistory({ type: 'apply', action, at: Date.now() })
  const game = history.present
  const player = game.players[playerIndex]
  const delta = getGroupDelta(history)
  return open ? (
    <CountersDrawer
      id="d"
      player={player}
      delta={delta?.target.playerId === player.id ? delta : null}
      monarchPlayerId={game.monarchPlayerId}
      initiativePlayerId={game.initiativePlayerId}
      dispatch={dispatch}
      onClose={() => setOpen(false)}
    />
  ) : (
    <p>chiusa</p>
  )
}

const drawer = () => screen.getByRole('group', { name: 'Contatori' })
const columns = () => within(drawer()).getAllByRole('group').map((column) => column.getAttribute('aria-label'))
const column = (name: string) => within(drawer()).getByRole('group', { name })
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

describe('Contatori drawer (R2 §5)', () => {
  it('lists exactly the counters, tax and table roles, in the stable order', () => {
    render(<Harness initial={createGame(2)} />)
    expect(columns()).toEqual(['Veleno', 'Energia', 'Esperienza', 'Radiazioni', 'Tassa C1', 'Monarca', 'Iniziativa'])
  })

  it('adds Tassa C2 only for a Partner deck, without duplicates', () => {
    render(<Harness initial={gameReducer(createGame(2), { type: 'set-partner', playerId: 'player-1', hasPartner: true })} />)
    expect(columns()).toEqual(['Veleno', 'Energia', 'Esperienza', 'Radiazioni', 'Tassa C1', 'Tassa C2', 'Monarca', 'Iniziativa'])
  })

  it('puts + first, then symbol, value and name, then − in each column', () => {
    render(<Harness initial={createGame(2)} />)
    const poison = column('Veleno')
    const parts = Array.from(poison.children).map((child) => child.getAttribute('aria-label') ?? child.className)
    expect(parts).toEqual(['Aggiungi 1 al veleno di Giocatore 1', 'counter-column__value', 'Togli 1 dal veleno di Giocatore 1'])
  })

  it('moves counters by one, floored at zero, with the D-036 delta on the value', () => {
    render(<Harness initial={createGame(2)} />)
    press("Aggiungi 1 all'energia di Giocatore 1")
    press("Aggiungi 1 all'energia di Giocatore 1")
    expect(within(column('Energia')).getByTestId('counter-value')).toHaveTextContent('2')
    expect(within(column('Energia')).getByTestId('delta-badge')).toHaveTextContent('+2')
    expect(screen.getByRole('button', { name: 'Togli 1 dalle radiazioni di Giocatore 1' })).toBeDisabled()
  })

  it('moves Commander tax by two, per slot with Partner', () => {
    render(<Harness initial={gameReducer(createGame(2), { type: 'set-partner', playerId: 'player-1', hasPartner: true })} />)
    press('Aggiungi 2 alla tassa del Comandante 2 di Giocatore 1')
    expect(within(column('Tassa C2')).getByTestId('counter-value')).toHaveTextContent('2')
    expect(within(column('Tassa C1')).getByTestId('counter-value')).toHaveTextContent('0')
    expect(screen.getByRole('button', { name: 'Togli 2 dalla tassa del Comandante 1 di Giocatore 1' })).toBeDisabled()
  })

  it('names the single tax without a slot number for a deck without Partner', () => {
    render(<Harness initial={createGame(2)} />)
    press('Aggiungi 2 alla tassa del comandante di Giocatore 1')
    expect(within(column('Tassa C1')).getByTestId('counter-value')).toHaveTextContent('2')
  })

  it('shows Sì or — for Monarch and Initiative; − releases only for the holder', () => {
    render(<Harness initial={gameReducer(createGame(2), { type: 'set-table-role', role: 'initiative', playerId: 'player-2' })} />)
    expect(within(column('Monarca')).getByTestId('counter-value')).toHaveTextContent('—')
    expect(screen.getByRole('button', { name: 'Rilascia Monarca (non è di Giocatore 1)' })).toBeDisabled()
    press('Prendi Monarca per Giocatore 1')
    expect(within(column('Monarca')).getByTestId('counter-value')).toHaveTextContent('Sì')
    expect(screen.getByRole('button', { name: 'Prendi Monarca (è già di Giocatore 1)' })).toBeDisabled()
    press('Rilascia Monarca di Giocatore 1')
    expect(within(column('Monarca')).getByTestId('counter-value')).toHaveTextContent('—')
    // Taking the Initiative from another player transfers it in one action.
    press('Prendi Iniziativa per Giocatore 1')
    expect(within(column('Iniziativa')).getByTestId('counter-value')).toHaveTextContent('Sì')
  })

  it('focuses its close control on open and closes from it', () => {
    render(<Harness initial={createGame(2)} />)
    const close = screen.getByRole('button', { name: 'Chiudi contatori' })
    expect(close).toHaveFocus()
    fireEvent.click(close)
    expect(screen.getByText('chiusa')).toBeInTheDocument()
  })

  it('carries a decorative compact rail with the short name and life', async () => {
    render(<Harness initial={createGame(2)} />)
    const rail = drawer().querySelector('.counters-drawer__rail') as HTMLElement
    expect(rail).toHaveAttribute('aria-hidden', 'true')
    expect(rail).toHaveTextContent('Giocatore 1')
    expect(rail).toHaveTextContent('40')
    await act(async () => undefined)
  })
})
