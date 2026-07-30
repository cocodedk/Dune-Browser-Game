// src/game-render/modes/conversation/figureNeck.ts
// A neck, drawn before the head fills over it. Its total absence was the
// critic's Critical 2 finding — "the head is decapitated" — no neck was
// ever drawn, and roughly 50px of raw backdrop showed between the jaw and
// the shoulders at the reference framing. A trapezoid closes that gap; the
// hard cast-shadow band across its top third, where the jaw occludes the
// key light, is what actually sells a head sitting ON a body rather than
// floating above a separately-drawn robe.

import type { PortraitDef } from '../../../data/portraits'
import { SKIN_TONES } from '../../../data/portraits'
import { mix } from './figureDetails'
import { jawWidth } from './figureFaceLayout'

export interface NeckGeometry {
  topY: number
  topHalfW: number
  bottomY: number
  bottomHalfW: number
  /** Bottom edge of the cast-shadow band: the top third of the neck. */
  shadowY: number
}

/**
 * Flares from jaw width at the throat to collar width at the shoulders.
 * `topY` sits just inside the face ellipse's own bottom edge (faceHalfH in
 * figureHead.ts is headR * 0.92), so the face draws over the neck's top
 * with no seam. `bottomY` lands just above where drawFigure's robe curve
 * actually starts (shoulderY - headR * 0.55), so the two shapes meet rather
 * than leaving the same gap this module exists to close.
 */
export function computeNeckGeometry(
  headR: number, jawHalfW: number, shoulderY: number, headY: number,
): NeckGeometry {
  const topY = headY + headR * 0.88
  const bottomY = shoulderY - headR * 0.5
  return {
    topY,
    topHalfW: jawHalfW * 0.42,
    bottomY,
    bottomHalfW: jawHalfW * 0.62,
    shadowY: topY + (bottomY - topY) / 3,
  }
}

/** Draw the neck. Call this before drawHead so the face ellipse overlaps
 * and seals the top seam. */
export function drawNeck(
  ctx: CanvasRenderingContext2D, def: PortraitDef,
  headX: number, headY: number, headR: number, shoulderY: number,
): void {
  const jawHalfW = jawWidth(headR, def.jaw)
  const g = computeNeckGeometry(headR, jawHalfW, shoulderY, headY)

  // Skin mixed 35% toward the figure colour — much less lit than the face
  // itself (figureHead.ts mixes 68% toward skin), because the neck sits
  // further from the key light and partly inside the jaw's own shadow.
  ctx.fillStyle = mix(SKIN_TONES[def.skinTone], def.figure, 0.35)
  ctx.beginPath()
  ctx.moveTo(headX - g.topHalfW, g.topY)
  ctx.lineTo(headX + g.topHalfW, g.topY)
  ctx.lineTo(headX + g.bottomHalfW, g.bottomY)
  ctx.lineTo(headX - g.bottomHalfW, g.bottomY)
  ctx.closePath()
  ctx.fill()

  // Hard cast shadow across the top third, where the jaw occludes the key
  // light. This band is what reads as a head sitting on a neck; the
  // trapezoid alone reads as a paper collar.
  ctx.fillStyle = 'rgba(8, 5, 6, 0.45)'
  ctx.beginPath()
  ctx.moveTo(headX - g.topHalfW, g.topY)
  ctx.lineTo(headX + g.topHalfW, g.topY)
  const shadowHalfW = g.topHalfW + (g.bottomHalfW - g.topHalfW) / 3
  ctx.lineTo(headX + shadowHalfW, g.shadowY)
  ctx.lineTo(headX - shadowHalfW, g.shadowY)
  ctx.closePath()
  ctx.fill()
}
