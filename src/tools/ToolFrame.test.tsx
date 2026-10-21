import { act, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { ToolFrame } from './ToolFrame'

const none = { top: 0, right: 0, bottom: 0, left: 0 }

/** A ResizeObserver whose callbacks the test fires by hand. */
let observed: Array<{ target: Element; callback: () => void }> = []
class FakeResizeObserver {
  constructor(private readonly callback: () => void) {}
  observe(target: Element) {
    observed.push({ target, callback: this.callback })
  }
  disconnect() {
    observed = observed.filter((entry) => entry.callback !== this.callback)
  }
}

/** Natural content size, as the unconstrained wrapper reports it. */
let content = { width: 160, height: 110 }

function Harness({ grown = false }: { grown?: boolean }) {
  const [result] = useState('17')
  return (
    <ToolFrame title="Dadi" anchor={{ x: 416, y: 200 }} viewport={{ x: 0, y: 0, width: 832, height: 400 }} insets={none} onBack={() => undefined}>
      {grown && <p data-testid="result">{result}</p>}
    </ToolFrame>
  )
}

beforeEach(() => {
  observed = []
  content = { width: 160, height: 110 }
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('hub-tool__content') ? content.height : 0
  })
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('hub-tool__content') ? content.width : 0
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const panel = () => screen.getByRole('group', { name: 'Dadi' })

describe('ToolFrame (R2 §8)', () => {
  it('measures the unconstrained content, not the clamped panel', () => {
    render(<Harness />)
    expect(observed.map((entry) => (entry.target as HTMLElement).className)).toContain('hub-tool__content')
    // 160 + 2×12 padding + 2×1 border.
    expect(panel().style.maxWidth).toBe('186px')
    expect(panel().style.maxHeight).toBe('136px')
  })

  it('places the panel again when a result makes the content taller, scrolling only if it cannot fit', () => {
    const { rerender } = render(<Harness />)
    content = { width: 160, height: 303 }
    rerender(<Harness grown />)
    act(() => observed.forEach((entry) => entry.callback()))
    expect(panel().style.maxHeight).toBe('329px')
    expect(panel()).not.toHaveAttribute('data-scroll')

    content = { width: 160, height: 600 }
    act(() => observed.forEach((entry) => entry.callback()))
    expect(panel().style.maxHeight).toBe('376px')
    expect(panel()).toHaveAttribute('data-scroll')
  })

  it('focuses «Torna agli strumenti» only once the panel is placed and visible', () => {
    const visibilityAtFocus: string[] = []
    const focus = HTMLElement.prototype.focus
    vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement) {
      visibilityAtFocus.push((this.closest('.hub-tool') as HTMLElement).style.visibility)
      focus.call(this)
    })
    render(<Harness />)
    expect(screen.getByRole('button', { name: 'Torna agli strumenti' })).toHaveFocus()
    expect(visibilityAtFocus).toEqual([''])
  })
})
