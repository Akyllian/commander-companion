import { act, fireEvent, render, screen } from '@testing-library/react'
import { updateStore } from '../pwa/updates'
import { AppNotices } from './AppNotices'

afterEach(() => updateStore.reset())

const renderNotices = (props: Partial<Parameters<typeof AppNotices>[0]> = {}) =>
  render(<AppNotices loadStatus="restored" saveFailed={false} onDismissLoadStatus={vi.fn()} placement="inline" {...props} />)

describe('AppNotices (R1)', () => {
  it('shows notices in the page flow outside the game', () => {
    renderNotices({ saveFailed: true })
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('data-placement', 'inline')
    expect(screen.getByText(/salvataggio non è disponibile/i)).toBeVisible()
  })

  it('shows the same notices as a toast during play', () => {
    renderNotices({ saveFailed: true, placement: 'toast' })
    expect(screen.getByRole('status')).toHaveAttribute('data-placement', 'toast')
    expect(screen.getByText(/salvataggio non è disponibile/i)).toBeVisible()
  })

  it('renders an empty live region when there is nothing to say', () => {
    renderNotices({ placement: 'toast' })
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('dismisses the recovered-save notice and offers the update', async () => {
    const onDismissLoadStatus = vi.fn()
    renderNotices({ loadStatus: 'recovered', onDismissLoadStatus })
    fireEvent.click(screen.getByRole('button', { name: 'Ok' }))
    expect(onDismissLoadStatus).toHaveBeenCalledOnce()

    const apply = vi.fn(async () => undefined)
    act(() => updateStore.markNeedRefresh(apply))
    fireEvent.click(screen.getByRole('button', { name: 'Aggiorna' }))
    expect(apply).toHaveBeenCalledOnce()
  })
})
