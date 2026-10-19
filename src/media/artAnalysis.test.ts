import {
  TARGET_CONTRAST,
  LIFE_ZONE_TRANSMISSION,
  luminancePercentile,
  MIN_CONTRAST,
  NAME_ZONE_TRANSMISSION,
  relativeLuminance,
  requiredBoost,
  TEXT_LUMINANCE,
  veilFor,
} from './artAnalysis'

const pixels = (...rgb: Array<[number, number, number]>) => rgb.flatMap(([r, g, b]) => [r, g, b, 255])
const contrast = (bg: number) => (TEXT_LUMINANCE + 0.05) / (bg + 0.05)

describe('artwork contrast analysis (C2.1)', () => {
  it('computes sRGB relative luminance', () => {
    expect(relativeLuminance(0, 0, 0)).toBe(0)
    expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1)
    expect(relativeLuminance(10, 10, 10)).toBeCloseTo(0.003, 3)
  })

  it('uses a high percentile so a few bright highlights count', () => {
    const mostlyDark = pixels(...Array.from({ length: 98 }, () => [20, 20, 20] as [number, number, number]), [255, 255, 255], [255, 255, 255])
    expect(luminancePercentile(mostlyDark)).toBeCloseTo(1)
    expect(luminancePercentile(mostlyDark, 0.5)).toBeCloseTo(relativeLuminance(20, 20, 20))
    expect(luminancePercentile([])).toBe(0)
  })

  it('adds no veil to dark art', () => {
    expect(requiredBoost(0.2, NAME_ZONE_TRANSMISSION)).toBe(0)
  })

  it('adds just enough veil to reach the 5:1 target (above the 4.5:1 contract) on bright art', () => {
    const boost = requiredBoost(1, LIFE_ZONE_TRANSMISSION)
    expect(boost).toBeGreaterThan(0)
    expect(contrast(1 * LIFE_ZONE_TRANSMISSION * (1 - boost))).toBeGreaterThanOrEqual(TARGET_CONTRAST)
    expect(contrast(1 * LIFE_ZONE_TRANSMISSION * (1 - (boost - 0.02)))).toBeLessThan(TARGET_CONTRAST)
    expect(TARGET_CONTRAST).toBeGreaterThan(MIN_CONTRAST)
  })

  it('measures the name and life regions separately', () => {
    const white = pixels([255, 255, 255])
    const black = pixels([0, 0, 0])
    expect(veilFor(white, black)).toEqual({ name: requiredBoost(1, NAME_ZONE_TRANSMISSION), life: 0 })
  })
})
