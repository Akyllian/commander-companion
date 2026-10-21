import { fireEvent, render, screen, within } from '@testing-library/react'
import { useReducer } from 'react'
import { createGame, gameReducer } from '../game/game'
import { createHistory, getGroupDelta, historyReducer } from '../game/history'
import type { GameAction, GameState, PlayerState } from '../game/types'
import { CommanderDamagePanel } from './CommanderDamagePanel'

function Harness({ initial, opponents }: { initial: GameState; opponents?: (players: PlayerState[]) => PlayerState[] }) {
  const [history, dispatchHistory] = useReducer(historyReducer, initial, createHistory)
  const dispatch = (action: GameAction) => dispatchHistory({ type: 'apply', action, at: Date.now() })
  const game = history.present
  const [player, ...others] = game.players
  const delta = getGroupDelta(history)
  return (
    <>
      <output data-testid="life">{player.life}</output>
      <CommanderDamagePanel
        id="c"
        player={player}
        opponents={opponents ? opponents(others) : others}
        delta={delta?.target.playerId === player.id ? delta : null}
        dispatch={dispatch}
        onClose={() => undefined}
      />
    </>
  )
}

const sources = () => screen.getByRole('radiogroup', { name: 'Sorgente dei danni Commander' })
const options = () => within(sources()).getAllByRole('radio')
const partnerGame = () => gameReducer(createGame(3), { type: 'set-partner', playerId: 'player-3', hasPartner: true })

describe('Danni Commander panel (R2 §6)', () => {
  it('preselects and still names the only source with two players', () => {
    render(<Harness initial={createGame(2)} />)
    expect(screen.getByText('Danni Commander')).toBeInTheDocument()
    expect(options().map((option) => option.textContent)).toEqual(['Giocatore 2 · ComandanteSelezionato'])
    expect(options()[0]).toHaveAttribute('aria-checked', 'true')
    expect(options()[0]).toHaveFocus()
  })

  it('lists each Partner commander as its own source, with check and «Selezionato» on the chosen one', () => {
    render(<Harness initial={partnerGame()} />)
    expect(options().map((option) => option.getAttribute('aria-label'))).toEqual([
      'Giocatore 2 · Comandante',
      'Giocatore 3 · Comandante 1',
      'Giocatore 3 · Comandante 2',
    ])
    fireEvent.click(options()[2])
    expect(options()[2]).toHaveAttribute('aria-checked', 'true')
    expect(within(options()[2]).getByText('Selezionato')).toBeInTheDocument()
    expect(within(options()[0]).queryByText('Selezionato')).not.toBeInTheDocument()
  })

  it('moves the choice with arrows and keeps a single tab stop', () => {
    render(<Harness initial={partnerGame()} />)
    fireEvent.keyDown(options()[0], { key: 'ArrowRight' })
    expect(options()[1]).toHaveFocus()
    expect(options()[1]).toHaveAttribute('aria-checked', 'true')
    fireEvent.keyDown(options()[1], { key: 'ArrowLeft' })
    fireEvent.keyDown(options()[0], { key: 'ArrowUp' })
    expect(options()[2]).toHaveAttribute('aria-checked', 'true')
    fireEvent.keyDown(options()[2], { key: 'ArrowDown' })
    fireEvent.keyDown(options()[0], { key: 'End' })
    fireEvent.keyDown(options()[2], { key: 'Home' })
    fireEvent.keyDown(options()[0], { key: 'x' })
    expect(options().map((option) => option.tabIndex)).toEqual([0, -1, -1])
  })

  it('adds damage and takes the same life in one action, mirrored by the delta', () => {
    render(<Harness initial={partnerGame()} />)
    fireEvent.click(options()[2])
    const add = screen.getByRole('button', { name: 'Aggiungi 1 danno Commander da Giocatore 3, Comandante 2 a Giocatore 1' })
    fireEvent.click(add)
    fireEvent.click(add)
    expect(screen.getByTestId('commander-value')).toHaveTextContent('2')
    expect(screen.getByTestId('life')).toHaveTextContent('38')
    expect(screen.getByTestId('delta-badge')).toHaveTextContent('+2')
    fireEvent.click(screen.getByRole('button', { name: 'Togli 1 danno Commander da Giocatore 3, Comandante 2 a Giocatore 1' }))
    expect(screen.getByTestId('life')).toHaveTextContent('39')
  })

  it('never shows a value below zero', () => {
    render(<Harness initial={createGame(2)} />)
    expect(screen.getByRole('button', { name: 'Togli 1 danno Commander da Giocatore 2 a Giocatore 1' })).toBeDisabled()
    expect(screen.getByTestId('commander-value')).toHaveTextContent('0')
  })

  it('explains a table without opponents and disables the stepper', () => {
    render(<Harness initial={createGame(2)} opponents={() => []} />)
    expect(screen.getByText('Nessun avversario disponibile')).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    const steps = screen.getAllByRole('button', { name: /danno Commander/ })
    expect(steps).toHaveLength(2)
    for (const step of steps) expect(step).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Chiudi danni Commander' })).toHaveFocus()
  })

  it('falls back to the first valid source when a Partner goes away, silently', () => {
    const initial = partnerGame()
    const { rerender } = render(<Harness initial={initial} />)
    fireEvent.click(options()[2])
    rerender(<Harness initial={initial} opponents={(others) => others.map((other) => ({ ...other, hasPartner: false }))} />)
    expect(options()).toHaveLength(2)
    expect(options()[0]).toHaveAttribute('aria-checked', 'true')
  })
})
