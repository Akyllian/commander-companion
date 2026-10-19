import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { createGame, gameReducer } from '../game/game'
import type { GameAction, PlayerState } from '../game/types'
import { QuickScoreDock, useScoreSelection } from './QuickScoreDock'

function Dock({ player, opponents, dispatch }: { player: PlayerState; opponents: PlayerState[]; dispatch: (action: GameAction) => void }) {
  const selection = useScoreSelection(player, opponents)
  const [lifeTaps, setLifeTaps] = useState(0)
  return (
    <QuickScoreDock
      player={player}
      opponents={opponents}
      selection={selection}
      delta={null}
      monarchPlayerId={null}
      initiativePlayerId={null}
      dispatch={dispatch}
      lifeControls={
        <button type="button" onClick={() => setLifeTaps((count) => count + 1)}>
          Vita +1 ({lifeTaps})
        </button>
      }
    />
  )
}

const game = gameReducer(createGame(4), { type: 'set-partner', playerId: 'player-3', hasPartner: true })
const [me, ...others] = game.players

describe('QuickScoreDock', () => {
  it('uses real buttons for every mode and role, with pressed state independent of colour', () => {
    render(<Dock player={me} opponents={others} dispatch={vi.fn()} />)
    const strip = screen.getByRole('group', { name: 'Punteggio di Giocatore 1' })
    for (const button of within(strip).getAllByRole('button')) {
      expect(button).toHaveAttribute('type', 'button')
      expect(button).toHaveAttribute('aria-pressed')
    }
  })

  it('shows the life controls it is given in Vita mode only', () => {
    render(<Dock player={me} opponents={others} dispatch={vi.fn()} />)
    expect(screen.getByRole('button', { name: /vita \+1/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^energia/i }))
    expect(screen.queryByRole('button', { name: /vita \+1/i })).not.toBeInTheDocument()
  })

  it('dispatches Commander damage for the selected source', () => {
    const dispatch = vi.fn()
    render(<Dock player={me} opponents={others} dispatch={dispatch} />)
    fireEvent.click(screen.getByRole('button', { name: /^commander/i }))
    fireEvent.click(screen.getByRole('button', { name: /^giocatore 3, comandante 2/i }))
    fireEvent.click(screen.getByRole('button', { name: /^aumenta danni commander/i }))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'adjust-commander-damage',
      playerId: 'player-1',
      sourcePlayerId: 'player-3',
      commander: 1,
      amount: 1,
    })
  })

  it('falls back to the first source when the chosen one leaves the table', () => {
    const dispatch = vi.fn()
    const view = render(<Dock player={me} opponents={others} dispatch={dispatch} />)
    fireEvent.click(screen.getByRole('button', { name: /^commander/i }))
    fireEvent.click(screen.getByRole('button', { name: /^giocatore 4/i }))
    view.rerender(<Dock player={me} opponents={others.slice(0, 2)} dispatch={dispatch} />)
    expect(screen.getAllByRole('button', { pressed: true }).map((button) => button.getAttribute('aria-label'))).toContain(
      'Giocatore 2: 0 danni',
    )
  })

  it('falls back to the first tax slot when Partner is removed', () => {
    const partner = game.players[2]
    const dispatch = vi.fn()
    const view = render(<Dock player={partner} opponents={game.players.filter((p) => p !== partner)} dispatch={dispatch} />)
    fireEvent.click(screen.getByRole('button', { name: /^tassa/i }))
    fireEvent.click(screen.getByRole('button', { name: /^comandante 2/i }))
    view.rerender(
      <Dock player={{ ...partner, hasPartner: false }} opponents={game.players.filter((p) => p !== partner)} dispatch={dispatch} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^aumenta di 2 mana/i }))
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'adjust-commander-tax', playerId: 'player-3', commander: 0, amount: 2 })
  })

  it('toggles a table role on and off for this player', () => {
    const dispatch = vi.fn()
    const view = render(<Dock player={me} opponents={others} dispatch={dispatch} />)
    fireEvent.click(screen.getByRole('button', { name: /^iniziativa/i }))
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'set-table-role', role: 'initiative', playerId: 'player-1' })
    view.unmount()
  })
})
