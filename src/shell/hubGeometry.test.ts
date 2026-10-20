import fc from 'fast-check'
import { largestQuadrant, placePanel, radialFits, RADIAL_SIZE, safeRect, VIEWPORT_MARGIN } from './hubGeometry'

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
})
