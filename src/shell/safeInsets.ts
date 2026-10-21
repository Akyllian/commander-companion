import type { Insets } from './hubGeometry'

const read = (value: string) => Number.parseFloat(value) || 0

/** The device safe-area insets in pixels, read from a probe padded with `env(safe-area-inset-*)`. */
export function readSafeInsets(): Insets {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'
  document.body.append(probe)
  const style = getComputedStyle(probe)
  const insets = { top: read(style.paddingTop), right: read(style.paddingRight), bottom: read(style.paddingBottom), left: read(style.paddingLeft) }
  probe.remove()
  return insets
}
