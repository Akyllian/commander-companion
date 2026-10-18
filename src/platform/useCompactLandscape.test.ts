import { act, renderHook } from '@testing-library/react'
import { installMatchMedia } from '../test/matchMedia'
import { useCompactLandscape } from './useCompactLandscape'

afterEach(() => vi.unstubAllGlobals())

describe('useCompactLandscape', () => {
  it('is false when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(renderHook(() => useCompactLandscape()).result.current).toBe(false)
  })

  it('reads the exact query, follows changes and cleans up', () => {
    const media = installMatchMedia(true)
    const { result, unmount } = renderHook(() => useCompactLandscape())

    expect(media.matchMedia).toHaveBeenCalledWith('(orientation: landscape) and (max-height: 30rem)')
    expect(result.current).toBe(true)

    act(() => media.set(false))
    expect(result.current).toBe(false)

    unmount()
    expect(media.list.removeEventListener).toHaveBeenCalled()
  })
})
