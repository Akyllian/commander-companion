import { clearanceFor, rhombusPoint } from './centre'
import type { Box } from './centre'

const box = (left: number, top: number, right: number, bottom: number): Box => ({ left, top, right, bottom })
const REACH = 32

// Four 200×120 cards with an 8px gap.
const grid4 = box(0, 0, 408, 248)
const cards4 = [box(0, 0, 200, 120), box(208, 0, 408, 120), box(0, 128, 200, 248), box(208, 128, 408, 248)]

describe('rhombusPoint (R1)', () => {
  it('sits on the crossing of a 2×2 table', () => {
    expect(rhombusPoint(grid4, cards4)).toEqual({ x: 204, y: 124 })
  })

  it('snaps to the nearest seam when the centre falls inside a card (three stacked)', () => {
    const stacked = [box(0, 0, 300, 200), box(0, 208, 300, 408), box(0, 416, 300, 616)]
    expect(rhombusPoint(box(0, 0, 300, 616), stacked)).toEqual({ x: 150, y: 204 })
  })

  it('snaps to the nearest side seam when three cards stand in one row (compact landscape)', () => {
    const row = [box(0, 0, 200, 300), box(208, 0, 408, 300), box(416, 0, 616, 300)]
    expect(rhombusPoint(box(0, 0, 616, 300), row)).toEqual({ x: 204, y: 150 })
  })

  describe('portrait column taller than the screen (R1 §13.1)', () => {
    // Four standard cards stacked on a 390×844 phone: the table centre is below the first screen.
    const column = [box(8, 8, 382, 448), box(8, 456, 382, 896), box(8, 904, 382, 1344), box(8, 1352, 382, 1792)]
    const table = box(8, 8, 382, 1792)
    const firstScreen = box(0, 0, 390, 844)

    it('moves to the first inner seam whose 64px zone is fully on the first screen', () => {
      expect(rhombusPoint(table, column, firstScreen)).toEqual({ x: 195, y: 452 })
    })

    it('keeps the centre when it is already on the first screen', () => {
      expect(rhombusPoint(grid4, cards4, box(0, 0, 844, 390))).toEqual({ x: 204, y: 124 })
    })

    it('keeps the centre when no seam fits on the first screen', () => {
      expect(rhombusPoint(table, column, box(0, 0, 390, 300))).toEqual({ x: 195, y: 900 })
    })
  })

  it('keeps the centre of an empty Tavolo centre cell', () => {
    const table = [box(0, 0, 408, 120), box(0, 128, 140, 528), box(268, 128, 408, 528), box(0, 536, 408, 656)]
    expect(rhombusPoint(box(0, 0, 408, 656), table)).toEqual({ x: 204, y: 328 })
  })
})

describe('clearanceFor (R1)', () => {
  const point = { x: 204, y: 124 }

  it('frees the corner each card turns to the centre in a grid', () => {
    expect(cards4.map((card) => clearanceFor(card, point, REACH, 0))).toEqual(['bottom-end', 'bottom-start', 'top-end', 'top-start'])
  })

  it('expresses the corner in the card frame when the card is turned 180° (Fronte a fronte)', () => {
    const orientations = [180, 180, 0, 0] as const
    expect(cards4.map((card, index) => clearanceFor(card, point, REACH, orientations[index]))).toEqual([
      'top-start',
      'top-end',
      'top-end',
      'top-start',
    ])
  })

  it('frees the middle of the facing edges for two cards side by side', () => {
    const left = box(0, 0, 200, 248)
    const right = box(208, 0, 408, 248)
    expect([clearanceFor(left, point, REACH, 0), clearanceFor(right, point, REACH, 0)]).toEqual(['end', 'start'])
  })

  it('frees the top edge of both players face to face', () => {
    const near = box(0, 128, 408, 248)
    const across = box(0, 0, 408, 120)
    expect([clearanceFor(near, point, REACH, 0), clearanceFor(across, point, REACH, 180)]).toEqual(['top', 'top'])
  })

  it('maps turned side seats into their own frame', () => {
    // A seat on the left turned 90°: its viewport right edge is the card's top edge.
    expect(clearanceFor(box(0, 0, 200, 248), point, REACH, 90)).toBe('top')
    // A seat on the right turned −90°: its viewport left edge is the card's top edge.
    expect(clearanceFor(box(208, 0, 408, 248), point, REACH, -90)).toBe('top')
  })

  it('leaves every Tavolo card alone, the centre cell being empty', () => {
    const table = [box(0, 0, 408, 120), box(0, 128, 140, 528), box(268, 128, 408, 528), box(0, 536, 408, 656)]
    const orientations = [180, 90, -90, 0] as const
    expect(table.map((card, index) => clearanceFor(card, { x: 204, y: 328 }, REACH, orientations[index]))).toEqual([
      null,
      null,
      null,
      null,
    ])
  })

  it('frees the edge of the middle card when three are stacked', () => {
    const seam = { x: 150, y: 204 }
    expect(clearanceFor(box(0, 0, 300, 200), seam, REACH, 0)).toBe('bottom')
    expect(clearanceFor(box(0, 208, 300, 408), seam, REACH, 0)).toBe('top')
  })

  it('ignores a card the free zone does not reach', () => {
    expect(clearanceFor(box(0, 400, 200, 520), point, REACH, 0)).toBeNull()
  })
})
