import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type React from 'react'
import type { Point } from '../shell/centre'
import { placePanel } from '../shell/hubGeometry'
import type { Insets, Rect } from '../shell/hubGeometry'

/** Below this viewport width the tools use their narrow arrangement (R2 §8). */
export const NARROW_VIEWPORT = 360

interface ToolFrameProps {
  title: string
  anchor: Point
  viewport: Rect
  insets: Insets
  onBack: () => void
  children: React.ReactNode
}

/**
 * The panel of one rhombus tool (R2 §8): measured, then centred on the rhombus and translated
 * inside the viewport margins, with a hairline back to the rhombus when it had to move. A panel
 * too large for the free area is clamped to it and scrolls inside, never the page.
 */
export function ToolFrame({ title, anchor, viewport, insets, onBack, children }: ToolFrameProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  // Focus lands deterministically on «Torna agli strumenti», never on the unmounted trigger.
  useEffect(() => backRef.current?.focus(), [])

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const measure = () => setSize({ width: panel.scrollWidth, height: panel.scrollHeight })
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(panel)
    return () => observer.disconnect()
  }, [])

  const placed = size ? placePanel(anchor, size, viewport, insets) : null
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
        ref={panelRef}
        className="hub-tool"
        role="group"
        aria-label={title}
        data-narrow={viewport.width < NARROW_VIEWPORT || undefined}
        data-scroll={placed?.scroll || undefined}
        style={style}
      >
        <div className="hub-tool__header">
          <p className="hub-tool__title">{title}</p>
          <button ref={backRef} type="button" className="quiet-button hub-tool__back" onClick={onBack}>
            Torna agli strumenti
          </button>
        </div>
        {children}
      </div>
    </>
  )
}
