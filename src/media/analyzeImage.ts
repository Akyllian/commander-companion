import { SAFE_BOOST, veilFor } from './artAnalysis'
import type { VeilBoost } from './artAnalysis'

/**
 * Browser glue: decodes the art crop, samples it at low resolution and measures the
 * name zone (full width × top 50%, since names can be long) and life zone (central 60% × rows 20–80%).
 * Regions are deliberately generous because the visible `cover` crop depends on the
 * panel's shape. Not unit-tested (needs a real canvas); the maths lives in artAnalysis.ts.
 */
export async function analyzeArt(blob: Blob): Promise<VeilBoost> {
  try {
    const bitmap = await createImageBitmap(blob)
    const width = 64
    const height = Math.max(1, Math.round((bitmap.height / bitmap.width) * width))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return SAFE_BOOST
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const region = (x: number, y: number, w: number, h: number) =>
      context.getImageData(Math.round(x * width), Math.round(y * height), Math.max(1, Math.round(w * width)), Math.max(1, Math.round(h * height))).data
    return veilFor(region(0, 0, 1, 0.5), region(0.2, 0.2, 0.6, 0.6))
  } catch {
    return SAFE_BOOST
  }
}
