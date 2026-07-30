// src/game-render/modes/conversation/drawFigure.ts
// The person on the portrait card, drawn with canvas paths.
//
// The previous figure was a circle for a head on an ellipse for shoulders.
// It composed correctly and it was legible, but nobody looking at it would
// say they were being spoken to by a person, and the character portrait is
// the single most recognisable thing about the game this one is answering to.
//
// Still procedural, and deliberately so: fourteen separately generated images
// never look like one hand. Every character is drawn by this function and
// differs only through PortraitDef, so the cast is guaranteed to match.
//
// All geometry is authored against a 300x420 card and scaled from there.

import type { PortraitDef } from '../../../data/portraits'
import { drawEyes, drawBeard, drawDress, drawMark, mix } from './figureDetails'
import { drawHead } from './figureHead'
import { drawHeadgear } from './figureHeadgear'

export interface FigureMetrics {
  width: number
  height: number
}

/** Where the head sits, so callers can put a rim light in the same place. */
export interface FigureLayout {
  headX: number
  headY: number
  headR: number
}

/**
 * Draw the hood, face, shoulders and dress.
 * @returns where the head landed, for the rim-light pass.
 */
export function drawFigure(
  ctx: CanvasRenderingContext2D,
  def: PortraitDef,
  { width: W, height: H }: FigureMetrics,
): FigureLayout {
  // A closer subject sits lower and larger in the frame.
  const scale = 0.86 + def.framing * 0.34
  const headR = 46 * scale * def.build
  const headX = W / 2
  const headY = H * 0.42 - def.framing * 22

  const shoulderY = headY + headR * 2.25
  const shoulderHalf = headR * 2.5 * def.build

  ctx.save()

  // --- Body: a robe, not an ellipse -----------------------------------------
  //
  // Drawn as two curves falling from the neck out to the frame edge. Real
  // cloth widens as it falls; the old semicircle read as a shoulder pad.
  //
  // Graded rather than flat-filled: the figure colours are near-black, and a
  // flat fill across half the card turned the robe into a hole in the image.
  // Lit at the shoulders where the key light would fall, falling away below.
  const cloth = ctx.createLinearGradient(0, shoulderY - headR, 0, H)
  cloth.addColorStop(0, mix(def.figure, '#e8a86a', 0.30))
  cloth.addColorStop(0.45, mix(def.figure, '#e8a86a', 0.10))
  cloth.addColorStop(1, def.figure)
  ctx.fillStyle = cloth
  ctx.beginPath()
  ctx.moveTo(headX - headR * 0.72, shoulderY - headR * 0.55)
  ctx.bezierCurveTo(
    headX - shoulderHalf * 0.9, shoulderY - headR * 0.1,
    headX - shoulderHalf * 1.15, shoulderY + headR * 1.2,
    headX - shoulderHalf * 1.25, H,
  )
  ctx.lineTo(headX + shoulderHalf * 1.25, H)
  ctx.bezierCurveTo(
    headX + shoulderHalf * 1.15, shoulderY + headR * 1.2,
    headX + shoulderHalf * 0.9, shoulderY - headR * 0.1,
    headX + headR * 0.72, shoulderY - headR * 0.55,
  )
  ctx.closePath()
  ctx.fill()

  // Folds: a few darker creases fanning from the shoulders. Three is enough
  // to read as cloth; more turns into corduroy.
  ctx.strokeStyle = 'rgba(0,0,0,0.30)'
  ctx.lineWidth = 2.2
  for (let i = -1; i <= 1; i++) {
    const x = headX + i * shoulderHalf * 0.52
    ctx.beginPath()
    ctx.moveTo(x, shoulderY + headR * 0.15)
    ctx.quadraticCurveTo(x + i * 12, shoulderY + headR * 1.5, x + i * 26, H)
    ctx.stroke()
  }

  // --- Head, face, then whatever covers it -----------------------------------
  //
  // Face first: it must be visible *inside* whatever headgear covers it, so
  // headgear is drawn on top (the hood cuts a ring through its own fill; a
  // cap or helm simply sits above the hairline).
  drawHead(ctx, def, headX, headY, headR)
  drawEyes(ctx, def, headX, headY, headR)
  drawBeard(ctx, def, headX, headY, headR)
  drawHeadgear(ctx, def, headX, headY, headR, shoulderY)
  drawDress(ctx, def, headX, shoulderY, headR)
  drawMark(ctx, def, headX, headY, headR, shoulderY)

  ctx.restore()
  return { headX, headY, headR }
}
