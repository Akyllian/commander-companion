import { fireEvent, render, screen } from '@testing-library/react'
import { ShellRhombus } from './ShellRhombus'

const setup = (expanded = false, showHint = false) => {
  const onToggle = vi.fn()
  render(<ShellRhombus expanded={expanded} controlsId="strumenti" showHint={showHint} onToggle={onToggle} />)
  return { onToggle }
}

describe('ShellRhombus (R1, R2 §7.1)', () => {
  it('names its single meaning and points at the hub', () => {
    setup(false)
    const button = screen.getByRole('button', { name: 'Apri strumenti e sezioni' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('aria-controls', 'strumenti')
  })

  it('names the open state', () => {
    setup(true)
    expect(screen.getByRole('button', { name: 'Chiudi strumenti' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('toggles on a single press', () => {
    const { onToggle } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Apri strumenti e sezioni' }))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('shows the first-use coach label only when asked, above the rhombus and silent for screen readers', () => {
    setup(false, true)
    const label = screen.getByText('Tocca ◇ per strumenti e sezioni')
    expect(label).toHaveAttribute('aria-hidden', 'true')
    const slot = label.parentElement as HTMLElement
    expect(slot.firstElementChild).toBe(label)
    expect(screen.getByRole('button', { name: 'Apri strumenti e sezioni' })).toBeInTheDocument()
  })

  it('has no hint once it has been used', () => {
    setup(false, false)
    expect(screen.queryByText('Tocca ◇ per strumenti e sezioni')).not.toBeInTheDocument()
  })
})
