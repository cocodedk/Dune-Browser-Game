// src/game-render/modes/conversation/figureHelm.ts
// The soldier's rigid helm: a shaded dome, a tapered crest fin, and cheek
// guards with an edge highlight — split out of figureHeadgear.ts because the
// old single straight-stroke "crest" read as a grey rectangle glued to the
// dome rather than a piece of metal, and fixing that took real geometry.

import type { PortraitDef } from '../../../data/portraits'
import { mix } from './figureDetails'

// The critic's Major 6: every existing metal value here mixes 35-60% from
// def.figure with soft gradient transitions and no specular, which is what
// read as a pageboy haircut rather than metal. 0.85 is well past the
// dome/crest's own maximum (0.6) precisely because a specular has to be a
// harder jump than any of the surrounding shading, not another gradient.
export const HELM_SPECULAR_MIX = 0.85
export const HELM_BRIM_MIX = 0.7

/** Rigid, cool-toned, straight-edged: reads as metal, never as cloth. */
export function drawHelm(
  ctx: CanvasRenderingContext2D, def: PortraitDef,
  headX: number, headY: number, headR: number,
): void {
  drawDome(ctx, def, headX, headY, headR)
  drawDomeSpecular(ctx, def, headX, headY, headR)
  drawBrimLine(ctx, def, headX, headY, headR)
  drawCrest(ctx, def, headX, headY, headR)
  drawCheekGuards(ctx, def, headX, headY, headR)
}

/** The dome's own outer path — shared with drawDomeSpecular so the specular
 * clips to the same curve it fills, rather than an approximation of it. */
function buildDomePath(headX: number, headY: number, headR: number): Path2D {
  const domePath = new Path2D()
  domePath.moveTo(headX - headR * 0.98, headY - headR * 0.05)
  domePath.quadraticCurveTo(headX - headR * 1.05, headY - headR * 1.15, headX, headY - headR * 1.22)
  domePath.quadraticCurveTo(headX + headR * 1.05, headY - headR * 1.15, headX + headR * 0.98, headY - headR * 0.05)
  domePath.lineTo(headX + headR * 0.82, headY - headR * 0.4)
  domePath.lineTo(headX - headR * 0.82, headY - headR * 0.4)
  domePath.closePath()
  return domePath
}

/** The dome, shaded with the same upper-left key light as the face so the
 * helm reads as curved metal instead of a flat grey shape. */
function drawDome(
  ctx: CanvasRenderingContext2D, def: PortraitDef,
  headX: number, headY: number, headR: number,
): void {
  const grad = ctx.createLinearGradient(
    headX - headR, headY - headR * 1.2, headX + headR * 0.6, headY - headR * 0.05,
  )
  grad.addColorStop(0, mix(def.figure, '#c8d0d8', 0.55))
  grad.addColorStop(0.5, mix(def.figure, '#8a96a0', 0.35))
  grad.addColorStop(1, mix(def.figure, '#4a545c', 0.4))
  ctx.fillStyle = grad
  ctx.fill(buildDomePath(headX, headY, headR))
}

/** A hard-edged specular streak following the dome's own curvature in the
 * upper-left quadrant — a solid stroke, not a gradient, because metal reads
 * from value jumps and a specular that fades is just another soft shade. */
function drawDomeSpecular(
  ctx: CanvasRenderingContext2D, def: PortraitDef,
  headX: number, headY: number, headR: number,
): void {
  ctx.save()
  ctx.clip(buildDomePath(headX, headY, headR))
  ctx.strokeStyle = mix(def.figure, '#eef4f8', HELM_SPECULAR_MIX)
  ctx.lineWidth = headR * 0.16
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(headX - headR * 0.68, headY - headR * 0.12)
  ctx.quadraticCurveTo(headX - headR * 0.78, headY - headR * 0.8, headX - headR * 0.18, headY - headR * 1.1)
  ctx.stroke()
  ctx.restore()
}

/** A hard, dark line at the dome-to-brow transition, and a cast shadow just
 * below it on the forehead already painted by figureHead.ts — this is what
 * seats the helm on the head rather than floating above it. */
function drawBrimLine(
  ctx: CanvasRenderingContext2D, def: PortraitDef,
  headX: number, headY: number, headR: number,
): void {
  ctx.fillStyle = 'rgba(6, 5, 8, 0.4)'
  ctx.beginPath()
  ctx.ellipse(headX, headY - headR * 0.3, headR * 0.84, headR * 0.12, 0, 0, Math.PI)
  ctx.fill()

  ctx.strokeStyle = mix(def.figure, '#000000', HELM_BRIM_MIX)
  ctx.lineWidth = Math.max(1.5, headR * 0.045)
  ctx.beginPath()
  ctx.moveTo(headX - headR * 0.82, headY - headR * 0.4)
  ctx.lineTo(headX + headR * 0.82, headY - headR * 0.4)
  ctx.stroke()
}

/**
 * A tapered fin from crown to brow, not a straight stroke: wide at the base,
 * narrow at the top, with its own lit and shadowed halves so it reads as a
 * ridge of metal standing proud of the dome rather than a bar drawn on it.
 */
function drawCrest(
  ctx: CanvasRenderingContext2D, def: PortraitDef,
  headX: number, headY: number, headR: number,
): void {
  const top = headY - headR * 1.24
  const base = headY - headR * 0.4
  const halfW = headR * 0.09

  ctx.fillStyle = mix(def.figure, '#d8e0e6', 0.6)
  ctx.beginPath()
  ctx.moveTo(headX - halfW * 0.15, top)
  ctx.lineTo(headX - halfW, base)
  ctx.lineTo(headX, base)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = mix(def.figure, '#3a424a', 0.55)
  ctx.beginPath()
  ctx.moveTo(headX + halfW * 0.15, top)
  ctx.lineTo(headX + halfW, base)
  ctx.lineTo(headX, base)
  ctx.closePath()
  ctx.fill()
}

/** Rigid flares with a thin edge highlight, so the guard reads as curved
 * plate rather than the flat triangle it is under the hood. */
function drawCheekGuards(
  ctx: CanvasRenderingContext2D, def: PortraitDef,
  headX: number, headY: number, headR: number,
): void {
  for (const side of [-1, 1]) {
    ctx.fillStyle = mix(def.figure, '#5a646c', side < 0 ? 0.4 : 0.2)
    ctx.beginPath()
    ctx.moveTo(headX + side * headR * 0.9, headY - headR * 0.35)
    ctx.lineTo(headX + side * headR * 1.02, headY + headR * 0.35)
    ctx.lineTo(headX + side * headR * 0.68, headY + headR * 0.28)
    ctx.closePath()
    ctx.fill()

    // Leading edge catches light regardless of side, the way a struck
    // metal edge does even on the shadowed cheek guard.
    ctx.strokeStyle = mix(def.figure, '#e8eef2', 0.5)
    ctx.lineWidth = Math.max(1, headR * 0.03)
    ctx.beginPath()
    ctx.moveTo(headX + side * headR * 0.9, headY - headR * 0.35)
    ctx.lineTo(headX + side * headR * 1.02, headY + headR * 0.35)
    ctx.stroke()
  }
}
