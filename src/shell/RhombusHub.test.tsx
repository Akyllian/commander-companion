import { fireEvent, render, screen, within } from '@testing-library/react'
import { RhombusHub } from './RhombusHub'

const none = { top: 0, right: 0, bottom: 0, left: 0 }
const phone = { x: 0, y: 0, width: 390, height: 844 }

function renderHub(overrides: Partial<React.ComponentProps<typeof RhombusHub>> = {}) {
  const onEvent = vi.fn()
  const onShowSections = vi.fn()
  render(
    <RhombusHub
      id="hub"
      surface={{ kind: 'hub' }}
      anchor={{ x: 195, y: 456 }}
      viewport={phone}
      insets={none}
      returnFocusTo={null}
      onEvent={onEvent}
      onShowSections={onShowSections}
      announcement=""
      {...overrides}
    />,
  )
  return { onEvent, onShowSections }
}

const actions = () => within(screen.getByRole('group', { name: 'Strumenti e sezioni' })).getAllByRole('button')

describe('rhombus hub (R2 §7)', () => {
  it('offers Sezioni, Dadi, Mana, Moneta in this order, each with visible text, focusing Sezioni', () => {
    renderHub()
    expect(actions().map((action) => action.textContent)).toEqual(['Sezioni', 'Dadi', 'Mana', 'Moneta'])
    expect(actions()[0]).toHaveFocus()
    expect(document.getElementById('hub')).toHaveAttribute('data-variant', 'radial')
  })

  it('switches to the 2×2 matrix in the largest free quadrant only when the radial does not fit', () => {
    renderHub({ anchor: { x: 60, y: 60 }, viewport: { x: 0, y: 0, width: 400, height: 300 } })
    const hub = document.getElementById('hub') as HTMLElement
    expect(hub).toHaveAttribute('data-variant', 'grid')
    expect(hub).toHaveAttribute('data-quadrant', 'bottom-end')
    expect(actions().map((action) => action.textContent)).toEqual(['Sezioni', 'Dadi', 'Mana', 'Moneta'])
  })

  it('opens a tool or the sections from the actions', () => {
    const { onEvent, onShowSections } = renderHub()
    fireEvent.click(actions()[2])
    expect(onEvent).toHaveBeenCalledWith({ type: 'open', surface: { kind: 'tool', tool: 'mana' } })
    fireEvent.click(actions()[0])
    expect(onShowSections).toHaveBeenCalledOnce()
  })

  it('refocuses the action that opened the tool when coming back', () => {
    renderHub({ returnFocusTo: 'coin' })
    expect(screen.getByRole('button', { name: 'Moneta' })).toHaveFocus()
  })

  it('shows the tool panel instead of the actions', () => {
    renderHub({ surface: { kind: 'tool', tool: 'dice' }, tool: <p>pannello dadi</p> })
    expect(screen.queryByRole('group', { name: 'Strumenti e sezioni' })).not.toBeInTheDocument()
    expect(screen.getByText('pannello dadi')).toBeInTheDocument()
  })

  it('closes on a tap outside and consumes it', () => {
    const { onEvent } = renderHub()
    const outside = document.querySelector('[data-hub-dismiss]') as HTMLElement
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    outside.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
    expect(onEvent).toHaveBeenCalledWith({ type: 'close' })
  })

  it('carries one polite region for tool results', () => {
    renderHub({ announcement: 'd20: 17' })
    expect(document.querySelectorAll('#hub [aria-live="polite"]')).toHaveLength(1)
    expect(screen.getByText('d20: 17')).toBeInTheDocument()
  })
})
