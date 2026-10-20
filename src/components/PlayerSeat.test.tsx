import { render, screen } from '@testing-library/react'
import { PlayerSeat, seatFor } from './PlayerSeat'

describe('seatFor (D-034)', () => {
  it.each([
    ['grid', [0, 0, 0, 0]],
    ['facing', [180, 180, 0, 0]],
    ['table', [0, 90, 180, -90]],
  ] as const)('orients the %s seats', (layout, orientations) => {
    expect([0, 1, 2, 3].map((index) => seatFor(layout, index).orientation)).toEqual(orientations)
  })

  it('turns the far player of a two-player table toward their side (D-035)', () => {
    expect([0, 1].map((index) => seatFor('two-facing', index))).toEqual([
      { seat: 'bottom', orientation: 0 },
      { seat: 'top', orientation: 180 },
    ])
  })

  it('puts the table seats on the approved edges', () => {
    expect([0, 1, 2, 3].map((index) => seatFor('table', index).seat)).toEqual(['bottom', 'left', 'top', 'right'])
  })

  it('keeps grid and facing seats in reading order', () => {
    expect([0, 1, 2, 3].map((index) => seatFor('facing', index).seat)).toEqual([
      'top-start',
      'top-end',
      'bottom-start',
      'bottom-end',
    ])
  })
})

describe('PlayerSeat', () => {
  it('wraps its content with seat and orientation data, without changing it', () => {
    render(
      <PlayerSeat layout="table" index={1}>
        <button type="button">Giocatore 2</button>
      </PlayerSeat>,
    )
    const seat = screen.getByRole('button', { name: 'Giocatore 2' }).closest('.player-seat') as HTMLElement
    expect(seat).toHaveAttribute('data-seat', 'left')
    expect(seat).toHaveAttribute('data-orientation', '90')
    expect(seat.querySelector('.player-seat__content')).toContainElement(screen.getByRole('button', { name: 'Giocatore 2' }))
  })
})
