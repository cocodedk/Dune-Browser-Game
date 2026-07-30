// src/game-render/modes/conversation/figureHeadgear.ts
// What sits on top of the head: hood, scarf, cap, helm, or nothing at all.
//
// This is the fix for "Stilgar is at every sietch" — the previous drawFigure
// drew one hood for the entire cast. A Duke in his own hall is bare-headed;
// an Imperial functionary wears a court cap; a soldier wears a rigid helm;
// only the Fremen (and the adapted few living among them) wear the hood or
// a wrapped scarf. Five genuinely different shapes, not five tinted hoods.

import type { PortraitDef } from '../../../data/portraits'
import { HAIR_TONES } from '../../../data/portraits'
import { mix } from './figureDetails'
import { drawHelm } from './figureHelm'

export function drawHeadgear(
  ctx: CanvasRenderingContext2D,
  def: PortraitDef,
  headX: number, headY: number, headR: number, shoulderY: number,
): void {
  switch (def.headgear) {
    case 'hood':
      drawHood(ctx, def, headX, headY, headR, shoulderY)
      return
    case 'helm':
      drawHelm(ctx, def, headX, headY, headR)
      return
    case 'cap':
      drawHair(ctx, def, headX, headY, headR, true)
      drawCap(ctx, def, headX, headY, headR)
      return
    case 'scarf':
      drawHair(ctx, def, headX, headY, headR, false)
      drawScarf(ctx, def, headX, headY, headR)
      return
    case 'bare':
      drawHair(ctx, def, headX, headY, headR, false)
      return
  }
}

/** The original hood: soft cloth, gathered at the shoulders. Fremen only. */
function drawHood(
  ctx: CanvasRenderingContext2D, def: PortraitDef,
  headX: number, headY: number, headR: number, shoulderY: number,
): void {
  const hoodFill = ctx.createLinearGradient(
    headX - headR * 1.2, headY - headR, headX + headR * 0.6, headY + headR,
  )
  hoodFill.addColorStop(0, mix(def.figure, '#e8a86a', 0.34))
  hoodFill.addColorStop(1, def.figure)
  ctx.fillStyle = hoodFill
  ctx.beginPath()
  ctx.ellipse(headX, headY - headR * 0.06, headR * 1.16, headR * 1.28, 0, 0, Math.PI * 2)
  // Face-hole ellipse shifted off the outer ellipse's own centre — two true
  // concentric ellipses is what read as a perfect torus (critic's
  // Critical 1); an asymmetric cutout gives the band a varying width the
  // way gathered cloth actually would.
  ctx.ellipse(headX + headR * 0.06, headY + headR * 0.09, headR * 0.78, headR * 0.96, 0, 0, Math.PI * 2)
  ctx.fill('evenodd')

  // Fold creases fanning from the crown, echoing the robe's own folds in
  // drawFigure.ts — without them the band is one smooth gradient across a
  // ring shape, which is most of what made it read as machined rather than
  // cloth.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)'
  ctx.lineWidth = Math.max(1, headR * 0.035)
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(headX + side * headR * 0.3, headY - headR * 1.05)
    ctx.quadraticCurveTo(
      headX + side * headR * 0.55, headY - headR * 0.3,
      headX + side * headR * 0.7, headY + headR * 0.5,
    )
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.moveTo(headX - headR * 1.14, headY + headR * 0.5)
  ctx.quadraticCurveTo(
    headX - headR * 1.5, shoulderY - headR * 0.2,
    headX - headR * 1.05, shoulderY + headR * 0.1,
  )
  ctx.lineTo(headX + headR * 1.05, shoulderY + headR * 0.1)
  ctx.quadraticCurveTo(
    headX + headR * 1.5, shoulderY - headR * 0.2,
    headX + headR * 1.14, headY + headR * 0.5,
  )
  ctx.closePath()
  ctx.fill()
}

/** A small close cap over the crown; hair shows at the temples below it. */
function drawCap(
  ctx: CanvasRenderingContext2D, def: PortraitDef,
  headX: number, headY: number, headR: number,
): void {
  ctx.fillStyle = mix(def.figure, '#e8a86a', 0.2)
  ctx.beginPath()
  ctx.ellipse(headX, headY - headR * 0.5, headR * 0.8, headR * 0.46, 0, Math.PI, 0)
  ctx.fill()
  ctx.strokeStyle = mix(def.figure, '#000000', 0.3)
  ctx.lineWidth = Math.max(1, headR * 0.03)
  ctx.beginPath()
  ctx.ellipse(headX, headY - headR * 0.15, headR * 0.8, headR * 0.14, 0, 0, Math.PI)
  ctx.stroke()
}

/** A wrapped band across the lower face and neck, tailing over one shoulder. */
function drawScarf(
  ctx: CanvasRenderingContext2D, def: PortraitDef,
  headX: number, headY: number, headR: number,
): void {
  ctx.fillStyle = mix(def.figure, '#e8a86a', 0.22)
  ctx.beginPath()
  ctx.ellipse(headX, headY + headR * 0.62, headR * 0.82, headR * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(headX + headR * 0.55, headY + headR * 0.75)
  ctx.quadraticCurveTo(
    headX + headR * 1.1, headY + headR * 1.6,
    headX + headR * 0.7, headY + headR * 2.4,
  )
  ctx.lineTo(headX + headR * 0.35, headY + headR * 2.3)
  ctx.quadraticCurveTo(
    headX + headR * 0.75, headY + headR * 1.5,
    headX + headR * 0.3, headY + headR * 0.7,
  )
  ctx.closePath()
  ctx.fill()
}

/**
 * Hair, drawn only when headgear leaves the scalp visible. `sidesOnly`
 * covers what a cap leaves showing — sideburns, not a full crown.
 */
function drawHair(
  ctx: CanvasRenderingContext2D, def: PortraitDef,
  headX: number, headY: number, headR: number, sidesOnly: boolean,
): void {
  if (def.hairStyle === 'none' || def.hairStyle === 'bald') return
  ctx.fillStyle = HAIR_TONES[def.hairTone]

  if (sidesOnly) {
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(headX + side * headR * 0.72, headY - headR * 0.05, headR * 0.14, headR * 0.3, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    return
  }

  ctx.beginPath()
  ctx.ellipse(headX, headY - headR * 0.5, headR * 0.82, headR * 0.5, 0, Math.PI, 0)
  ctx.fill()

  if (def.hairStyle === 'long') {
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(headX + side * headR * 0.78, headY - headR * 0.3)
      ctx.quadraticCurveTo(
        headX + side * headR * 1.05, headY + headR * 0.7,
        headX + side * headR * 0.6, headY + headR * 1.9,
      )
      ctx.lineTo(headX + side * headR * 0.4, headY + headR * 1.8)
      ctx.quadraticCurveTo(
        headX + side * headR * 0.78, headY + headR * 0.65,
        headX + side * headR * 0.6, headY - headR * 0.22,
      )
      ctx.closePath()
      ctx.fill()
    }
  }
}
