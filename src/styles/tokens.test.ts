import tokens from './tokens.css?raw'
import app from './app.css?raw'

/** R2 motion (spec §10): every new duration is a token, and reduced motion zeroes them all. */
describe('R2 motion tokens', () => {
  it.each([
    ['--duration-surface-in', '180ms'],
    ['--duration-surface-out', '140ms'],
    ['--duration-tool-swap', '140ms'],
    ['--duration-dice', '160ms'],
    ['--duration-coin', '220ms'],
    ['--duration-art-fade', '140ms'],
  ])('defines %s as %s', (name, value) => {
    expect(tokens).toContain(`${name}: ${value};`)
  })

  it.each([
    ['--deck-row-min-height', '88px'],
    ['--deck-hero-height', '168px'],
    ['--deck-art-size', '64px'],
    ['--hand-crop-width', 'clamp(7rem, 31vw, 8.5rem)'],
    ['--duration-deck-step', '180ms'],
    ['--duration-hand-deal', '160ms'],
    ['--duration-hand-out', '120ms'],
  ])('defines the R3 token %s as %s', (name, value) => {
    expect(tokens).toContain(`${name}: ${value};`)
  })

  it('keeps the global reduced-motion rule for animations and transitions', () => {
    const rule = app.slice(app.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(rule).toMatch(/animation-duration: 0\.01ms !important/)
    expect(rule).toMatch(/transition-duration: 0\.01ms !important/)
  })
})

/** OKLCH → relative luminance (WCAG), for the non-text contrast of the mana symbols. */
function luminance(oklch: string): number {
  const [l, c, h] = oklch.match(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/)!.slice(1).map(Number)
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const sc = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clamp = (value: number) => Math.min(1, Math.max(0, value))
  const r = clamp(4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc)
  const g = clamp(-1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc)
  const bl = clamp(-0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc)
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl
}
const contrast = (x: string, y: string) => {
  const [hi, lo] = [luminance(x), luminance(y)].toSorted((p, q) => q - p)
  return (hi + 0.05) / (lo + 0.05)
}
const token = (name: string) => tokens.match(new RegExp(`${name}: (oklch\\([^)]*\\));`))?.[1] ?? ''

describe('mana symbol colours (R2 review, F34 exception)', () => {
  const MANA = ['w', 'u', 'b', 'r', 'g', 'c'] as const

  it.each(MANA)('gives --mana-%s at least 3:1 on both ink tones', (type) => {
    const colour = token(`--mana-${type}`)
    expect(colour).toMatch(/^oklch/)
    expect(contrast(colour, token('--primitive-ink-950'))).toBeGreaterThanOrEqual(3)
    expect(contrast(colour, token('--primitive-ink-900'))).toBeGreaterThanOrEqual(3)
  })

  it('keeps six distinct colours', () => {
    expect(new Set(MANA.map((type) => token(`--mana-${type}`))).size).toBe(6)
  })
})
