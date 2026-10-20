import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Section } from './sections'
import { SectionNav } from './SectionNav'

const setup = (section: Section = 'altro', state: 'persistent' | 'revealed' | 'hidden' = 'persistent') => {
  const onNavigate = vi.fn()
  const onRequestClose = vi.fn()
  const view = render(
    <SectionNav id="sezioni" section={section} state={state} onNavigate={onNavigate} onRequestClose={onRequestClose} />,
  )
  return { onNavigate, onRequestClose, view }
}

describe('SectionNav (R1)', () => {
  it('lists the four sections in order with visible labels and one current page', () => {
    setup('impara')
    const nav = screen.getByRole('navigation', { name: 'Sezioni' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.textContent?.trim())).toEqual(['Partita', 'Mazzi', 'Impara', 'Altro'])
    expect(links.filter((link) => link.getAttribute('aria-current') === 'page').map((link) => link.textContent?.trim())).toEqual([
      'Impara',
    ])
    expect(nav.querySelector('[role="tab"]')).toBeNull()
  })

  it('exposes nothing focusable while hidden', () => {
    setup('partita', 'hidden')
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(document.getElementById('sezioni')).toHaveAttribute('hidden')
  })

  it('navigates without following the link', () => {
    const { onNavigate } = setup('altro')
    const event = fireEvent.click(screen.getByRole('link', { name: 'Mazzi' }), { detail: 1 })
    expect(event).toBe(false)
    expect(onNavigate).toHaveBeenCalledWith('mazzi', false)
  })

  it('asks to close instead of navigating when Partita is chosen during play', () => {
    const { onNavigate, onRequestClose } = setup('partita', 'revealed')
    fireEvent.click(screen.getByRole('link', { name: 'Partita' }))
    expect(onRequestClose).toHaveBeenCalledOnce()
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
