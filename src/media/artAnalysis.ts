/**
 * Contrast contract for player artwork (docs/CANONICAL_VISUAL_GAP_REVIEW.md, C2.1; D-026).
 * The fixed layered veil reaches 4.5:1 on typical art but not on very bright art, so each
 * downloaded image is measured once and the veil is strengthened locally where needed —
 * never with heavier text glow.
 */

export interface VeilBoost {
  /** Extra veil opacity (0–0.85) behind the player name. */
  name: number
  /** Extra veil opacity (0–0.85) behind the life value. */
  life: number
}

export const NO_BOOST: VeilBoost = { name: 0, life: 0 }
/** Used when an image cannot be measured: readability first. */
export const SAFE_BOOST: VeilBoost = { name: 0.5, life: 0.5 }

/** Relative luminance of the ivory text, oklch(0.936 0.038 88). */
export const TEXT_LUMINANCE = 0.8204
export const MIN_CONTRAST = 4.5
/** Aim above the contract: the analysis samples a percentile, the eye meets the brightest pixel. */
export const TARGET_CONTRAST = 5
const MAX_BOOST = 0.85

/**
 * Share of the art's light that still reaches the eye through the base veil (global 34% tint,
 * vertical 24% → 46% → 88%), taken conservatively at the brightest point each text sits on.
 * The name value ignores the top-left edge veil, because long names extend beyond it
 * (measured in the browser: a 0.40 estimate let a long name fall to 3.5:1).
 */
export const NAME_ZONE_TRANSMISSION = 0.5
/** The standard life total starts around 28% of the panel height (vertical veil ≈ 38%). */
export const LIFE_ZONE_TRANSMISSION = 0.42
/** Near-maximum brightness: highlights right behind the digits decide legibility (0.9 let bright art fall to 3.4:1). */
export const ANALYSIS_PERCENTILE = 0.98

const channel = (value: number) => {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Luminance at the given percentile of an RGBA pixel buffer (bright details matter, not the mean). */
export function luminancePercentile(rgba: ArrayLike<number>, percentile = ANALYSIS_PERCENTILE): number {
  const values: number[] = []
  for (let index = 0; index + 3 < rgba.length; index += 4) {
    values.push(relativeLuminance(rgba[index], rgba[index + 1], rgba[index + 2]))
  }
  if (values.length === 0) return 0
  values.sort((a, b) => a - b)
  return values[Math.min(values.length - 1, Math.floor(percentile * values.length))]
}

/** Extra veil opacity so that text over `artLuminance` seen through `transmission` reaches 5:1 (≥ 4.5:1 contract). */
export function requiredBoost(artLuminance: number, transmission: number): number {
  const maxBackground = (TEXT_LUMINANCE + 0.05) / TARGET_CONTRAST - 0.05
  const background = artLuminance * transmission
  if (background <= maxBackground) return 0
  const boost = 1 - maxBackground / background
  return Math.min(MAX_BOOST, Math.ceil(boost * 100) / 100)
}

export function veilFor(nameRegion: ArrayLike<number>, lifeRegion: ArrayLike<number>): VeilBoost {
  return {
    name: requiredBoost(luminancePercentile(nameRegion), NAME_ZONE_TRANSMISSION),
    life: requiredBoost(luminancePercentile(lifeRegion), LIFE_ZONE_TRANSMISSION),
  }
}
