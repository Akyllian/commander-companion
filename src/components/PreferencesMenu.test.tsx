import { fireEvent, render, screen } from '@testing-library/react'
import { PreferencesMenu } from './PreferencesMenu'

const setup = (supportsPopover: boolean) => {
  const onChange = vi.fn()
  render(
    <>
      <PreferencesMenu preferences={{ keepScreenOn: true }} onChange={onChange} supportsPopover={supportsPopover} />
      <p>fuori</p>
    </>,
  )
  return { onChange, button: screen.getByRole('button', { name: 'Preferenze' }) }
}

describe('PreferencesMenu (fallback without the Popover API)', () => {
  it('toggles with its button and reports changes', () => {
    const { onChange, button } = setup(false)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(button).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('checkbox', { name: /mantieni lo schermo acceso/i }))
    expect(onChange).toHaveBeenCalledWith({ keepScreenOn: false })

    fireEvent.click(button)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('closes with Escape, returning focus to the button', () => {
    const { button } = setup(false)
    fireEvent.click(button)
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('closes on a click outside but not inside', () => {
    const { button } = setup(false)
    fireEvent.click(button)
    fireEvent.pointerDown(screen.getByRole('checkbox'))
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    fireEvent.pointerDown(screen.getByText('fuori'))
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})

describe('PreferencesMenu (native Popover API)', () => {
  it('wires the button to an auto popover and anchors it under the button on open', () => {
    const { button } = setup(true)
    const panel = document.getElementById(button.getAttribute('aria-controls') as string) as HTMLElement
    expect(button).toHaveAttribute('popovertarget', panel.id)
    expect(panel).toHaveAttribute('popover', 'auto')

    const toggle = (newState: 'open' | 'closed', type: string) => {
      const event = new Event(type) as Event & { newState: string; oldState: string }
      Object.assign(event, { newState, oldState: newState === 'open' ? 'closed' : 'open' })
      fireEvent(panel, event)
    }
    toggle('closed', 'beforetoggle')
    expect(panel.style.top).toBe('')
    toggle('open', 'beforetoggle')
    toggle('open', 'toggle')
    expect(panel.style.top).toBe('8px')
    expect(panel.style.right).toMatch(/px$/)
    // The browser exposes the expanded state for popovertarget; we only mirror it for styling.
    expect(button).not.toHaveAttribute('aria-expanded')
    expect(button).toHaveAttribute('data-open', 'true')
    toggle('closed', 'toggle')
    expect(button).not.toHaveAttribute('data-open')
  })
})
