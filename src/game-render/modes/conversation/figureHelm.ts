// src/game-render/modes/conversation/figureHelm.ts
// The soldier's rigid helm: a shaded dome, a tapered crest fin, and cheek
// guards with an edge highlight — split out of figureHeadgear.ts because the
// old single straight-stroke "crest" read as a grey rectangle glued to the
// dome rather than a piece of metal, and fixing that took real geometry.

import type { PortraitDef } from '../../../data/portraits'
import { mix } from './figureDetails'

/** Rigid, cool-toned, straight-edged: reads as metal, never as cloth. */
export function drawHelm(
  ctx: CanvasRenderingContext2D, def: PortraitDef,
  headX: number, headY: number, headR: number,
): void {
  drawDome(ctx, def, headX, headY, headR)
  drawCrest(ctx, def, headX, headY, headR)
  drawCheekGuards(ctx, def, headX, headY, headR)
}

/** The dome, shaded with the same upper-left key light as the face so the
 * helm reads as curved metal instead of a flat grey shape. */
function drawDome(
  ctx: CanvasRenderingContext2D, def: PortraitDef,
  headX: number, headY: number, headR: number,
): void {
  const domePath = new Path2D()
  domePath.moveTo(headX - headR * 0.98, headY - headR * 0.05)
  domePath.quadraticCurveTo(headX - headR * 1.05, headY - headR * 1.15, headX, headY - headR * 1.22)
  domePath.quadraticCurveTo(headX + headR * 1.05, headY - headR * 1.15, headX + headR * 0.98, headY - headR * 0.05)
  domePath.lineTo(headX + headR * 0.82, headY - headR * 0.4)
  domePath.lineTo(headX - headR * 0.82, headY - headR * 0.4)
  domePath.closePath()

  const grad = ctx.createLinearGradient(
    headX - headR, headY - headR * 1.2, headX + headR * 0.6, headY - headR * 0.05,
  )
  grad.addColorStop(0, mix(def.figure, '#c8d0d8', 0.55))
  grad.addColorStop(0.5, mix(def.figure, '#8a96a0', 0.35))
  grad.addColorStop(1, mix(def.figure, '#4a545c', 0.4))
  ctx.fillStyle = grad
  ctx.fill(domePath)
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
