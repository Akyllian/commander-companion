import { act, render, screen } from '@testing-library/react'
import { GROUP_WINDOW_MS } from '../game/history'
import type { GroupTarget } from '../game/history'
import { DELTA_EXIT_MS, DeltaSlot } from './DeltaBadge'
import type { PanelDelta } from './DeltaBadge'

const life: GroupTarget = { kind: 'life', playerId: 'player-1' }
const poison: GroupTarget = { kind: 'counter', playerId: 'player-1', counter: 'poison' }
const burst = (delta: number, at: number, key = 'life@0', target: GroupTarget = life): PanelDelta => ({ key, target, delta, at })
const badge = () => screen.queryByTestId('delta-badge')

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('DeltaSlot (D-036)', () => {
  it('keeps one badge for a burst and updates its number in place', () => {
    const view = render(<DeltaSlot delta={burst(-1, 0)} target={life} />)
    const first = badge()
    expect(first).toHaveTextContent('−1')
    view.rerender(<DeltaSlot delta={burst(-3, 300)} target={life} />)
    expect(badge()).toBe(first)
    expect(badge()).toHaveTextContent('−3')
  })

  it('stays 700 ms after the last tap, then exits over 160 ms', () => {
    const view = render(<DeltaSlot delta={burst(2, 0)} target={life} />)
    act(() => vi.advanceTimersByTime(500))
    view.rerender(<DeltaSlot delta={burst(3, 500)} target={life} />)
    act(() => vi.advanceTimersByTime(GROUP_WINDOW_MS - 1))
    expect(badge()).not.toHaveAttribute('data-phase', 'exit')
    act(() => vi.advanceTimersByTime(1))
    expect(badge()).toHaveAttribute('data-phase', 'exit')
    act(() => vi.advanceTimersByTime(DELTA_EXIT_MS))
    expect(badge()).toBeNull()
  })

  it('lets the badge exit when the next burst concerns another value', () => {
    const view = render(<DeltaSlot delta={burst(2, 0)} target={life} />)
    view.rerender(<DeltaSlot delta={burst(1, 100, 'poison@100', poison)} target={life} />)
    expect(badge()).toHaveAttribute('data-phase', 'exit')
    expect(badge()).toHaveTextContent('+2')
    act(() => vi.advanceTimersByTime(DELTA_EXIT_MS))
    expect(badge()).toBeNull()
  })

  it('starts a fresh badge for a new burst on the same value', () => {
    const view = render(<DeltaSlot delta={burst(2, 0)} target={life} />)
    const first = badge()
    view.rerender(<DeltaSlot delta={burst(-1, 900, 'life@900')} target={life} />)
    expect(badge()).not.toBe(first)
    expect(badge()).toHaveTextContent('−1')
  })

  it('shows nothing for a burst with no net change', () => {
    render(<DeltaSlot delta={burst(0, 0)} target={life} />)
    expect(badge()).toBeNull()
  })

  it('is decorative for screen readers', () => {
    render(<DeltaSlot delta={burst(4, 0)} target={life} />)
    expect(badge()).toHaveAttribute('aria-hidden', 'true')
  })
})
