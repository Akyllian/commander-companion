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

  it('keeps the global reduced-motion rule for animations and transitions', () => {
    const rule = app.slice(app.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(rule).toMatch(/animation-duration: 0\.01ms !important/)
    expect(rule).toMatch(/transition-duration: 0\.01ms !important/)
  })
})
