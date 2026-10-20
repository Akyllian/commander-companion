import { fireEvent, render, screen } from '@testing-library/react'
import { ShellRhombus } from './ShellRhombus'

const setup = (expanded = false, showHint = false) => {
  const onToggle = vi.fn()
  render(<ShellRhombus expanded={expanded} controlsId="sezioni" showHint={showHint} onToggle={onToggle} />)
  return { onToggle }
}

describe('ShellRhombus (R1)', () => {
  it('names the closed state and points at the navigation', () => {
    setup(false)
    const button = screen.getByRole('button', { name: 'Mostra le sezioni' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('aria-controls', 'sezioni')
  })

  it('names the open state', () => {
    setup(true)
    expect(screen.getByRole('button', { name: 'Nascondi le sezioni' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('toggles on a single press', () => {
    const { onToggle } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Mostra le sezioni' }))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('shows the first-use hint only when asked, as plain text', () => {
    setup(false, true)
    expect(screen.getByText('Tocca il sigillo per le sezioni').tagName).toBe('P')
  })

  it('has no hint once it has been used', () => {
    setup(false, false)
    expect(screen.queryByText('Tocca il sigillo per le sezioni')).not.toBeInTheDocument()
  })
})
