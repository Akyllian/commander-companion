import { act, renderHook } from '@testing-library/react'
import { SECTIONS, sectionFromHash } from './sections'
import { useSection } from './useSection'

afterEach(() => window.history.replaceState(null, '', window.location.pathname))

describe('sectionFromHash (R1)', () => {
  it.each([
    ['', 'partita'],
    ['#', 'partita'],
    ['#partita', 'partita'],
    ['#ignota', 'partita'],
    ['#mazzi', 'mazzi'],
    ['#impara', 'impara'],
    ['#altro', 'altro'],
  ])('reads %j as %s', (hash, section) => {
    expect(sectionFromHash(hash)).toBe(section)
  })

  it('keeps the four sections in their fixed order', () => {
    expect(SECTIONS).toEqual(['partita', 'mazzi', 'impara', 'altro'])
  })
})

describe('useSection (R1)', () => {
  it('starts from the address and pushes a history entry on navigation', () => {
    window.history.replaceState(null, '', '#impara')
    const { result } = renderHook(() => useSection())
    expect(result.current[0]).toBe('impara')

    act(() => result.current[1]('altro'))
    expect(window.location.hash).toBe('#altro')
    expect(result.current[0]).toBe('altro')

    act(() => result.current[1]('partita'))
    expect(window.location.hash).toBe('')
    expect(result.current[0]).toBe('partita')
  })

  it('follows Back and Forward', () => {
    const { result } = renderHook(() => useSection())
    act(() => {
      window.history.replaceState(null, '', '#mazzi')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current[0]).toBe('mazzi')
    act(() => {
      window.history.replaceState(null, '', window.location.pathname)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(result.current[0]).toBe('partita')
  })
})
