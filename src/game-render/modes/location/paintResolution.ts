// src/game-render/modes/location/paintResolution.ts
// How many pixels to paint the location art at.
//
// PURE — takes the display size and returns a texture size, so the rule is
// testable without a DOM and lives in one place instead of two magic numbers.
//
// The bug this fixes: the diorama backdrop was painted at a fixed 1000px tall
// and the hotspot label layer at a fixed 768px, whatever the window was. Both
// are then stretched across the full viewport, so on a 1440p display the
// backdrop is upscaled ~1.4x and the labels ~1.9x, and on a 4K display ~2.2x
// and ~2.8x. The larger and better the screen, the softer the scene looked —
// which is exactly backwards, and is what "pixelated on large screens" is.

/**
 * Never paint below this. Small windows still get art that survives being
 * looked at, and it keeps the old behaviour as a floor rather than a target.
 */
export const MIN_PAINT_HEIGHT = 1000

/**
 * Ceiling on the painted height.
 *
 * WebGL2 guarantees only 2048 for a texture dimension; most desktop GPUs offer
 * far more, but there is no reason to bet the location view on it. A 4K display
 * at this height still resolves better than the old fixed 1000.
 */
export const MAX_PAINT_HEIGHT = 2048

/**
 * Ceiling on the painted width, for very wide windows.
 *
 * An ultrawide at 2048 tall would otherwise ask for a ~5000px canvas; 4096 is
 * the widest dimension that is safe to assume.
 */
export const MAX_PAINT_WIDTH = 4096

/**
 * Device pixel ratios above this buy nothing visible here.
 *
 * The location view is painted 2D art on a plane, not geometry — past 2x the
 * extra samples cost fill rate and memory for detail the art does not contain.
 */
export const MAX_RATIO = 2

/**
 * Height, in texture pixels, to paint the location art at.
 *
 * @param cssHeight       Displayed height of the canvas, in CSS pixels.
 * @param devicePixelRatio Physical pixels per CSS pixel.
 */
export function paintHeightFor(cssHeight: number, devicePixelRatio: number): number {
  const ratio = Math.min(Math.max(devicePixelRatio, 1), MAX_RATIO)
  const wanted = Math.round(Math.max(cssHeight, 0) * ratio)
  return Math.min(MAX_PAINT_HEIGHT, Math.max(MIN_PAINT_HEIGHT, wanted))
}

/**
 * Width to match a painted height at the view's aspect, clamped.
 *
 * @param aspect Visible width divided by visible height.
 */
export function paintWidthFor(height: number, aspect: number): number {
  const safe = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  return Math.min(MAX_PAINT_WIDTH, Math.max(1, Math.round(height * safe)))
}
