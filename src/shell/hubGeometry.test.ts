import fc from 'fast-check'
import { largestQuadrant, MATRIX_SIZE, placeMatrix, placePanel, placeToolPanel, radialFits, RADIAL_SIZE, safeRect, VIEWPORT_MARGIN } from './hubGeometry'

const none = { top: 0, right: 0, bottom: 0, left: 0 }
const viewport = (width: number, height: number) => ({ x: 0, y: 0, width, height })

describe('rhombus hub geometry (R2 §7.3, §8)', () => {
  it('uses a 228px radial and a 12px margin', () => {
    expect(RADIAL_SIZE).toBe(228)
    expect(VIEWPORT_MARGIN).toBe(12)
  })

  it('fits the radial on the portrait phone and the smallest phone', () => {
    expect(radialFits({ x: 195, y: 456 }, viewport(390, 844), none)).toBe(true)
    expect(radialFits({ x: 160, y: 284 }, viewport(320, 568), none)).toBe(true)
  })

  it('does not fit when the radial would cross the safe area or the margin', () => {
    expect(radialFits({ x: 422, y: 100 }, viewport(844, 390), { ...none, top: 40 })).toBe(false)
    expect(radialFits({ x: 125, y: 300 }, viewport(844, 600), none)).toBe(false)
    expect(radialFits({ x: 126, y: 300 }, viewport(844, 600), none)).toBe(true)
  })

  it('shrinks the viewport by margin and insets', () => {
    expect(safeRect(viewport(390, 844), { top: 47, right: 0, bottom: 34, left: 0 })).toEqual({ x: 12, y: 59, width: 366, height: 739 })
  })

  it('opens the fallback in the largest free quadrant', () => {
    expect(largestQuadrant({ x: 60, y: 60 }, viewport(400, 300), none)).toBe('bottom-end')
    expect(largestQuadrant({ x: 340, y: 240 }, viewport(400, 300), none)).toBe('top-start')
    expect(largestQuadrant({ x: 60, y: 240 }, viewport(400, 300), none)).toBe('top-end')
    expect(largestQuadrant({ x: 340, y: 60 }, viewport(400, 300), none)).toBe('bottom-start')
  })

  it('centres a panel on the rhombus when it fits', () => {
    expect(placePanel({ x: 195, y: 456 }, { width: 200, height: 160 }, viewport(390, 844), none)).toEqual({
      rect: { x: 95, y: 376, width: 200, height: 160 },
      translated: false,
      scroll: false,
    })
  })

  it('translates a colliding panel inside the margins without moving the rhombus', () => {
    const placed = placePanel({ x: 370, y: 456 }, { width: 200, height: 160 }, viewport(390, 844), { ...none, right: 10 })
    expect(placed.rect.x).toBe(390 - 12 - 10 - 200)
    expect(placed.translated).toBe(true)
    expect(placed.scroll).toBe(false)
  })

  it('clamps a panel larger than the safe rect and lets only its inside scroll', () => {
    const placed = placePanel({ x: 422, y: 195 }, { width: 300, height: 500 }, viewport(844, 390), none)
    expect(placed.rect.height).toBe(390 - 24)
    expect(placed.rect.y).toBe(12)
    expect(placed.scroll).toBe(true)
  })

  it('always returns a rect inside the safe area', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 280, max: 1600 }),
        fc.integer({ min: 280, max: 1200 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.integer({ min: 40, max: 900 }),
        fc.integer({ min: 40, max: 900 }),
        fc.integer({ min: 0, max: 50 }),
        (width, height, fx, fy, panelWidth, panelHeight, inset) => {
          const insets = { top: inset, right: 0, bottom: inset, left: 0 }
          const safe = safeRect(viewport(width, height), insets)
          const { rect } = placePanel({ x: fx * width, y: fy * height }, { width: panelWidth, height: panelHeight }, viewport(width, height), insets)
          expect(rect.x).toBeGreaterThanOrEqual(safe.x - 1e-9)
          expect(rect.y).toBeGreaterThanOrEqual(safe.y - 1e-9)
          expect(rect.x + rect.width).toBeLessThanOrEqual(safe.x + safe.width + 1e-9)
          expect(rect.y + rect.height).toBeLessThanOrEqual(safe.y + safe.height + 1e-9)
        },
      ),
    )
  })

  it('opens the 2×2 matrix in its quadrant, kept inside the margins (320px phone)', () => {
    expect(MATRIX_SIZE).toEqual({ width: 134, height: 118 })
    // Rhombus at the first seam of a 320×568 column: the top-start matrix would start at x = −14.
    const placed = placeMatrix({ x: 160, y: 504 }, 'top-start', viewport(320, 568), none)
    expect(placed).toEqual({ x: 12, y: 504 - 40 - 118 })
    expect(placeMatrix({ x: 100, y: 100 }, 'bottom-end', viewport(390, 844), none)).toEqual({ x: 140, y: 140 })
  })

  it('always keeps the matrix inside the safe area', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 280, max: 1600 }),
        fc.integer({ min: 280, max: 1200 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (width, height, fx, fy) => {
          const centre = { x: fx * width, y: fy * height }
          const quadrant = largestQuadrant(centre, viewport(width, height), none)
          const { x, y } = placeMatrix(centre, quadrant, viewport(width, height), none)
          const safe = safeRect(viewport(width, height), none)
          expect(x).toBeGreaterThanOrEqual(safe.x)
          expect(y).toBeGreaterThanOrEqual(safe.y)
          expect(x + MATRIX_SIZE.width).toBeLessThanOrEqual(safe.x + safe.width + 1e-9)
          expect(y + MATRIX_SIZE.height).toBeLessThanOrEqual(safe.y + safe.height + 1e-9)
        },
      ),
    )
  })

  it('puts a tool panel beside the rhombus, never under it, on the side with room', () => {
    // 390×844 portrait, rhombus at the first seam: room below, so the panel opens below.
    const below = placeToolPanel({ x: 195, y: 456 }, { width: 218, height: 300 }, viewport(390, 844), none)
    expect(below.rect).toEqual({ x: 86, y: 456 + 40, width: 218, height: 300 })
    expect(below.scroll).toBe(false)
    // Near the bottom: it opens above instead.
    const above = placeToolPanel({ x: 195, y: 760 }, { width: 218, height: 300 }, viewport(390, 844), none)
    expect(above.rect.y).toBe(760 - 40 - 300)
  })

  it('opens beside the rhombus horizontally when neither above nor below has room (landscape)', () => {
    const side = placeToolPanel({ x: 422, y: 165 }, { width: 220, height: 282 }, viewport(844, 330), none)
    const { x, y, width, height } = side.rect
    const clear = x >= 422 + 28 || x + width <= 422 - 28 || y >= 165 + 28 || y + height <= 165 - 28
    expect(clear).toBe(true)
    expect(side.scroll).toBe(false)
  })

  it('opens a too-tall panel beside the rhombus, scrolling inside (640×400, 200% zoom)', () => {
    const placed = placeToolPanel({ x: 320, y: 200 }, { width: 220, height: 428 }, viewport(640, 400), none)
    expect(placed.rect).toEqual({ x: 360, y: 12, width: 220, height: 376 })
    expect(placed.scroll).toBe(true)
  })

  it('covers every side deterministically, and falls back to a clamped centred panel', () => {
    // Before the rhombus (no room after it), normal and too tall.
    expect(placeToolPanel({ x: 560, y: 200 }, { width: 220, height: 300 }, viewport(640, 400), none).rect.x).toBe(560 - 40 - 220)
    expect(placeToolPanel({ x: 560, y: 200 }, { width: 220, height: 428 }, viewport(640, 400), none).rect).toEqual({
      x: 300,
      y: 12,
      width: 220,
      height: 376,
    })
    // After it, normal height.
    expect(placeToolPanel({ x: 100, y: 200 }, { width: 220, height: 300 }, viewport(640, 400), none).rect.x).toBe(140)
    // No side wide or tall enough: centred and clamped, scrolling.
    const fallback = placeToolPanel({ x: 320, y: 200 }, { width: 600, height: 500 }, viewport(640, 400), none)
    expect(fallback.scroll).toBe(true)
    expect(fallback.rect).toEqual({ x: 20, y: 12, width: 600, height: 376 })
  })

  it('keeps the tool panel inside the safe area and off the rhombus whenever one side has room', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 1600 }),
        fc.integer({ min: 320, max: 1200 }),
        fc.double({ min: 0.1, max: 0.9, noNaN: true }),
        fc.double({ min: 0.1, max: 0.9, noNaN: true }),
        fc.integer({ min: 120, max: 400 }),
        fc.integer({ min: 120, max: 450 }),
        (width, height, fx, fy, panelWidth, panelHeight) => {
          const centre = { x: fx * width, y: fy * height }
          const vp = viewport(width, height)
          const safe = safeRect(vp, none)
          const { rect } = placeToolPanel(centre, { width: panelWidth, height: panelHeight }, vp, none)
          expect(rect.x).toBeGreaterThanOrEqual(safe.x - 1e-9)
          expect(rect.y).toBeGreaterThanOrEqual(safe.y - 1e-9)
          expect(rect.x + rect.width).toBeLessThanOrEqual(safe.x + safe.width + 1e-9)
          expect(rect.y + rect.height).toBeLessThanOrEqual(safe.y + safe.height + 1e-9)
          const room = {
            below: safe.y + safe.height - (centre.y + 40) >= panelHeight && panelWidth <= safe.width,
            above: centre.y - 40 - safe.y >= panelHeight && panelWidth <= safe.width,
            end: safe.x + safe.width - (centre.x + 40) >= panelWidth && panelHeight <= safe.height,
            start: centre.x - 40 - safe.x >= panelWidth && panelHeight <= safe.height,
          }
          const clear = rect.x >= centre.x + 28 || rect.x + rect.width <= centre.x - 28 || rect.y >= centre.y + 28 || rect.y + rect.height <= centre.y - 28
          // Off the rhombus whenever one side has room.
          expect(clear || !Object.values(room).some(Boolean)).toBe(true)
        },
      ),
    )
  })
})
