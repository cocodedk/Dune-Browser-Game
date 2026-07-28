// src/game-render/core/orthoFit.ts
// PURE: fitting a fixed-size authored frame into whatever shape the window is.
//
// The orthographic modes — the location diorama and the conversation card —
// were built with fixed frusta (1600x1000 and 1400x900) and nothing ever
// resized them. Renderer.applySize updates the *perspective* camera's aspect
// and nothing else, so on any window that is not exactly 1.60 or 1.556 wide
// the art was squashed or stretched to fit. On a 2.37 ultrawide that is a 48%
// horizontal stretch, which is what "the aspects on the screen are strange"
// looks like.
//
// The frame's height is held and its width follows the window, so vertical
// framing never moves; the art is then scaled to cover the result.

export interface OrthoFit {
  /** Visible world extent, matching the canvas aspect. */
  viewWidth: number
  viewHeight: number
  /** Uniform scale that makes the authored frame cover the visible extent. */
  coverScale: number
}

/**
 * @param frameWidth  Authored frame width in world units.
 * @param frameHeight Authored frame height in world units.
 */
export function fitOrtho(
  frameWidth: number,
  frameHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): OrthoFit {
  // A zero-sized canvas happens for a frame or two during mount and on a
  // hidden tab. Falling back to the authored aspect keeps the projection
  // finite rather than producing NaN bounds that blank the screen.
  const safeWidth = canvasWidth > 0 ? canvasWidth : frameWidth
  const safeHeight = canvasHeight > 0 ? canvasHeight : frameHeight
  const aspect = safeWidth / safeHeight

  const viewHeight = frameHeight
  const viewWidth = frameHeight * aspect

  return {
    viewWidth,
    viewHeight,
    // Cover, not contain: a backdrop must never letterbox into bars.
    coverScale: Math.max(viewWidth / frameWidth, viewHeight / frameHeight),
  }
}

/**
 * Canvas-normalised pointer position to authored-frame position.
 *
 * The frame is scaled uniformly to cover, so the visible slice of it is
 * narrower or wider than the frame itself. Without this inverse, hit targets
 * drift away from the labels drawn for them as soon as the window stops
 * matching the authored aspect.
 *
 * @returns x from the left and y from the *bottom*, matching how hotspots are
 *   authored — the caller does not need to flip again.
 */
export function canvasToFrame(
  fit: OrthoFit,
  frameWidth: number,
  frameHeight: number,
  nx: number,
  ny: number,
): { fx: number; fy: number } {
  const spanX = (frameWidth * fit.coverScale) / fit.viewWidth
  const spanY = (frameHeight * fit.coverScale) / fit.viewHeight
  return {
    fx: 0.5 + (nx - 0.5) / spanX,
    fy: 0.5 - (ny - 0.5) / spanY,
  }
}
