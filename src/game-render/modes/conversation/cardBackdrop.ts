// src/game-render/modes/conversation/cardBackdrop.ts
// The backdrop layer, painted before the figure: base gradient, a flat warm
// lift, a diagonal key shaft, and an edge-darkening multiply that pins the
// area right around the head below the face's own lit value.
//
// Split out of CharacterCard.ts because the old single radial "key glow"
// did two jobs at once — lighting the backdrop and implying where the key
// light came from — and conflating them is what produced the halo the
// critic named (Major 4): a glow centred almost directly behind the head
// reads as a nimbus, not a window. Splitting the shaft (anchored to a fixed
// card corner, independent of head position) from the edge-darken (anchored
// to the head) lets each do one job.

import type { PortraitDef } from '../../../data/portraits'

/**
 * Was 0.28 — a flat lift that strong put the brightest value in the frame
 * on empty backdrop instead of the face (critic's Critical 3: backdrop
 * L83-85 next to a lit cheek of L90, near-zero separation). Chosen by
 * arithmetic against figureValueTargets.ts's model, not from a rendered
 * frame — verify in scripts/shoot.mjs before trusting the exact value.
 */
export const BACKDROP_LIFT_ALPHA = 0.12

/**
 * Alpha of the edge-darken multiply at the ring immediately outside the
 * head silhouette (the gradient's inner stop) — this is what the critic's
 * "at or below L45 wherever it borders the head" target actually reaches.
 */
export const EDGE_DARKEN_ALPHA = 0.6

export function paintBackdropBase(
  ctx: CanvasRenderingContext2D, def: PortraitDef, width: number, height: number,
): void {
  const backdrop = ctx.createLinearGradient(0, 0, 0, height)
  backdrop.addColorStop(0, def.backTop)
  backdrop.addColorStop(1, def.backBottom)
  ctx.fillStyle = backdrop
  ctx.fillRect(0, 0, width, height)

  ctx.globalAlpha = BACKDROP_LIFT_ALPHA
  ctx.fillStyle = '#e8a86a'
  ctx.fillRect(0, 0, width, height)
  ctx.globalAlpha = 1
}

/**
 * A diagonal shaft anchored to the card's own corner rather than to the
 * head, so its bright core sits well off the head axis (critic's Major 4:
 * the old radial's centre sat almost directly behind the head). Paints only
 * the backdrop — the figure gets its own lighting pass after drawFigure, in
 * cardFigureLight.ts, so light can actually land on the person.
 */
export function paintKeyShaft(
  ctx: CanvasRenderingContext2D, def: PortraitDef, width: number, height: number,
): void {
  ctx.save()
  ctx.translate(width * 0.08, height * 0.05)
  ctx.rotate(-0.5)
  const len = width * 1.7
  const shaft = ctx.createLinearGradient(0, 0, len, 0)
  shaft.addColorStop(0, `rgba(255, 214, 156, ${0.16 + def.keyHardness * 0.26})`)
  shaft.addColorStop(0.55, 'rgba(255, 214, 156, 0.05)')
  shaft.addColorStop(1, 'rgba(255, 214, 156, 0)')
  ctx.fillStyle = shaft
  ctx.fillRect(0, -height, len, height * 2)
  ctx.restore()
}

/**
 * Darkens the backdrop specifically where it borders the head, via a
 * multiply blend so it can only darken, never brighten, the base gradient.
 * Fades out by 2.3 head-radii so the rest of the backdrop is untouched —
 * this is a contact shadow around the figure, not a full frame vignette.
 */
export function paintEdgeDarken(
  ctx: CanvasRenderingContext2D, headX: number, headY: number, headR: number,
): void {
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  const edge = ctx.createRadialGradient(headX, headY, headR * 0.85, headX, headY, headR * 2.3)
  edge.addColorStop(0, `rgba(40, 32, 24, ${EDGE_DARKEN_ALPHA})`)
  edge.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = edge
  ctx.fillRect(headX - headR * 2.3, headY - headR * 2.3, headR * 4.6, headR * 4.6)
  ctx.restore()
}
