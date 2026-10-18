import { act, fireEvent, render, screen } from '@testing-library/react'
import { updateStore } from '../pwa/updates'
import { AppNotices } from './AppNotices'

afterEach(() => updateStore.reset())

const renderNotices = (props: Partial<Parameters<typeof AppNotices>[0]> = {}) =>
  render(
    <AppNotices
      loadStatus="restored"
      saveFailed={false}
      onDismissLoadStatus={vi.fn()}
      supportsPopover={false}
      {...props}
    />,
  )

describe('AppNotices', () => {
  it('shows notices inline in the standard layout', () => {
    renderNotices({ saveFailed: true })
    expect(screen.getByText(/salvataggio non è disponibile/i)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Stato app' })).not.toBeInTheDocument()
  })

  it('renders nothing visible in compact mode without notices', () => {
    renderNotices({ compact: true })
    expect(screen.queryByRole('button', { name: 'Stato app' })).not.toBeInTheDocument()
  })

  it('collapses every notice behind one Stato app button with its count', () => {
    const onDismissLoadStatus = vi.fn()
    renderNotices({ compact: true, saveFailed: true, loadStatus: 'recovered', onDismissLoadStatus })
    act(() => updateStore.markNeedRefresh(async () => undefined))

    const trigger = screen.getByRole('button', { name: 'Stato app' })
    expect(trigger).toHaveAccessibleDescription('3 avvisi')
    expect(screen.getByText('Stato app: 3 avvisi')).toBeInTheDocument()
    expect(screen.getByText(/non era leggibile/i)).not.toBeVisible()

    fireEvent.click(trigger)
    expect(screen.getByText(/salvataggio non è disponibile/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aggiorna' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ok' }))
    expect(onDismissLoadStatus).toHaveBeenCalledOnce()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(trigger).toHaveFocus()
  })

  it('uses the singular for one notice', () => {
    renderNotices({ compact: true, saveFailed: true })
    expect(screen.getByRole('button', { name: 'Stato app' })).toHaveAccessibleDescription('1 avviso')
  })
})
