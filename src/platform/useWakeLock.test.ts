import { renderHook } from '@testing-library/react'
import { useWakeLock } from './useWakeLock'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function installWakeLock(request: () => Promise<Partial<WakeLockSentinel>>) {
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: vi.fn(request) } })
  return (navigator as Navigator & { wakeLock: { request: ReturnType<typeof vi.fn> } }).wakeLock.request
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock')
})

describe('useWakeLock', () => {
  it('does nothing when the API is unavailable', () => {
    expect(() => renderHook(() => useWakeLock()).unmount()).not.toThrow()
  })

  it('requests the lock, re-acquires it after the page returns and releases on unmount', async () => {
    let sentinel = { released: false, release: vi.fn(async () => undefined) }
    const request = installWakeLock(async () => sentinel)

    const { unmount } = renderHook(() => useWakeLock())
    await flush()
    expect(request).toHaveBeenCalledTimes(1)

    // Still held: a visibility change must not stack a second lock.
    document.dispatchEvent(new Event('visibilitychange'))
    await flush()
    expect(request).toHaveBeenCalledTimes(1)

    sentinel.released = true
    sentinel = { released: false, release: vi.fn(async () => undefined) }
    document.dispatchEvent(new Event('visibilitychange'))
    await flush()
    expect(request).toHaveBeenCalledTimes(2)

    unmount()
    expect(sentinel.release).toHaveBeenCalled()
  })

  it('ignores refused requests', async () => {
    const request = installWakeLock(async () => {
      throw new Error('NotAllowedError')
    })
    renderHook(() => useWakeLock())
    await flush()
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('releases a lock granted after unmount', async () => {
    const release = vi.fn(async () => undefined)
    let resolve: (value: Partial<WakeLockSentinel>) => void = () => undefined
    installWakeLock(() => new Promise((done) => (resolve = done)))

    const { unmount } = renderHook(() => useWakeLock())
    unmount()
    resolve({ released: false, release })
    await flush()
    expect(release).toHaveBeenCalled()
  })

  it('stays idle when disabled', () => {
    const request = installWakeLock(async () => ({ released: false, release: vi.fn() }))
    renderHook(() => useWakeLock(false))
    expect(request).not.toHaveBeenCalled()
  })
})
