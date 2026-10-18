import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { ModalSideSheet } from './ModalSideSheet'

function Harness({ supportsModal }: { supportsModal: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Apri
      </button>
      <ModalSideSheet open={open} title="Dettagli" onClose={() => setOpen(false)} supportsModal={supportsModal}>
        <button type="button">Primo</button>
        <button type="button">Ultimo</button>
      </ModalSideSheet>
    </>
  )
}

describe('ModalSideSheet fallback (no showModal)', () => {
  beforeEach(() => {
    const root = document.createElement('div')
    root.id = 'root'
    document.body.append(root)
  })
  afterEach(() => document.getElementById('root')?.remove())

  it('is a labelled modal that traps Tab, closes with Escape and restores focus', () => {
    render(<Harness supportsModal={false} />, { container: document.getElementById('root') as HTMLElement })
    const opener = screen.getByRole('button', { name: 'Apri' })
    opener.focus()
    fireEvent.click(opener)

    const sheet = screen.getByRole('dialog', { name: 'Dettagli' })
    expect(sheet).toHaveAttribute('aria-modal', 'true')
    expect(document.getElementById('root')).toHaveAttribute('inert')
    const close = screen.getByRole('button', { name: 'Chiudi' })
    expect(close).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: 'Ultimo' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(close).toHaveFocus()
    fireEvent.keyDown(document, { key: 'a' })

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.getElementById('root')).not.toHaveAttribute('inert')
    expect(opener).toHaveFocus()
  })

  it('closes from the Close button in native mode', () => {
    render(<Harness supportsModal />)
    fireEvent.click(screen.getByRole('button', { name: 'Apri' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('button', { name: 'Primo' })).not.toBeInTheDocument()
  })
})
