import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type React from 'react'
import type { Point } from '../shell/centre'
import { placeToolPanel } from '../shell/hubGeometry'
import type { Insets, Rect } from '../shell/hubGeometry'

/** Below this viewport width the tools use their narrow arrangement (R2 §8). */
export const NARROW_VIEWPORT = 360

/** The panel's padding (12px) and border (1px) on both sides; `.hub-tool` uses the same values. */
const PANEL_CHROME = 2 * 12 + 2 * 1

interface ToolFrameProps {
  title: string
  anchor: Point
  viewport: Rect
  insets: Insets
  onBack: () => void
  children: React.ReactNode
}

/**
 * The panel of one rhombus tool (R2 §8): measured, then placed beside the rhombus so the rhombus
 * stays visible as the global close, kept inside the viewport margins, with a hairline back to
 * the rhombus when it had to move. A panel too large for the free area is clamped to it and
 * scrolls inside, never the page.
 */
export function ToolFrame({ title, anchor, viewport, insets, onBack, children }: ToolFrameProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  // The content wrapper is never constrained, so a result that appears later (dice, coin) is
  // measured at its natural size and the panel is placed again (R2 review).
  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return
    const measure = () => setSize({ width: content.scrollWidth + PANEL_CHROME, height: content.scrollHeight + PANEL_CHROME })
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  const placed = size ? placeToolPanel(anchor, size, viewport, insets) : null

  // Focus lands on «Torna agli strumenti» once the panel is placed and visible, never on the
  // unmounted trigger or on <body>.
  const visible = placed !== null
  useEffect(() => {
    if (visible) backRef.current?.focus()
  }, [visible])
  const style: React.CSSProperties = placed
    ? { left: placed.rect.x, top: placed.rect.y, maxWidth: placed.rect.width, maxHeight: placed.rect.height }
    : { left: anchor.x, top: anchor.y, visibility: 'hidden' }

  // The hairline runs from the rhombus to the nearest point of the moved panel.
  let tether: React.ReactNode = null
  if (placed?.translated) {
    const { x, y, width, height } = placed.rect
    const near = { x: Math.min(Math.max(anchor.x, x), x + width), y: Math.min(Math.max(anchor.y, y), y + height) }
    const length = Math.hypot(near.x - anchor.x, near.y - anchor.y)
    const angle = Math.atan2(near.y - anchor.y, near.x - anchor.x)
    tether = length > 0 && (
      <span className="hub-tool__tether" aria-hidden="true" style={{ left: anchor.x, top: anchor.y, width: length, rotate: `${angle}rad` }} />
    )
  }

  return (
    <>
      {tether}
      <div
        className="hub-tool"
        role="group"
        aria-label={title}
        data-narrow={viewport.width < NARROW_VIEWPORT || undefined}
        data-scroll={placed?.scroll || undefined}
        style={style}
      >
        <div ref={contentRef} className="hub-tool__content">
          <div className="hub-tool__header">
            <p className="hub-tool__title">{title}</p>
            <button ref={backRef} type="button" className="quiet-button hub-tool__back" onClick={onBack}>
              Torna agli strumenti
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  )
}
