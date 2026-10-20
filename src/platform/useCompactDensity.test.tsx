import { act, renderHook } from '@testing-library/react'
import { installMatchMedia } from '../test/matchMedia'
import { COMPACT_DENSITY_QUERY, useCompactDensity } from './useCompactDensity'

afterEach(() => vi.unstubAllGlobals())

describe('useCompactDensity', () => {
  it('is false when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(renderHook(() => useCompactDensity()).result.current).toBe(false)
  })

  it('follows usable height only, never orientation (D-034)', () => {
    expect(COMPACT_DENSITY_QUERY).toBe('(max-height: 30rem)')
    expect(COMPACT_DENSITY_QUERY).not.toMatch(/orientation/)
  })

  it('reads the exact query, follows changes and cleans up', () => {
    const media = installMatchMedia(true)
    const { result, unmount } = renderHook(() => useCompactDensity())

    expect(media.matchMedia).toHaveBeenCalledWith('(max-height: 30rem)')
    expect(result.current).toBe(true)

    act(() => media.set(false))
    expect(result.current).toBe(false)

    unmount()
    expect(media.list.removeEventListener).toHaveBeenCalled()
  })
})
