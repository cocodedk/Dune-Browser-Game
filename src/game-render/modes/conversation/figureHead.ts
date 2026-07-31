// src/game-render/modes/conversation/figureHead.ts
// The face itself: skin tone, then structure — brow, nose, cheekbone, mouth,
// chin and jaw — then the age lines that keep a Reverend Mother from sharing
// a face with a girl of seventeen.
//
// Split from drawFigure because the head is a decision about who someone is
// (skin, age, jaw), while drawFigure only cares where things sit on the card.
// The feature geometry itself lives in figureFaceLayout.ts (pure, tested);
// the shading passes live in figureFaceShade.ts. This file just calls them
// in the order light would actually build up on a face: base tone, then the
// one diagonal wash, then each feature back to front.

import type { PortraitDef } from '../../../data/portraits'
import { SKIN_TONES } from '../../../data/portraits'
import { mix } from './figureDetails'
import { computeFaceLayout } from './figureFaceLayout'
import {
  paintKeyShade, paintBrowRidge, paintNose, paintCheekbones, paintMouth, paintChinAndJaw,
} from './figureFaceShade'

// Mixed to 0.68 rather than the previous 0.55: at 0.55 the face read as
// close to a black silhouette and barely separated from the hood behind it.
// Chosen by eye from the palette arithmetic, not from a rendered frame —
// verify in scripts/shoot.mjs before trusting the exact value. Exported so
// figureValueTargets.ts's pure compositing model uses this constant rather
// than a second copy of it, which would drift from the real draw silently.
export const FACE_SKIN_MIX = 0.68

/** Fill the face and build its structure from light, not outlines. */
export function drawHead(
  ctx: CanvasRenderingContext2D,
  def: PortraitDef,
  headX: number, headY: number, headR: number,
): void {
  const layout = computeFaceLayout(def, headR)
  const faceHalfH = headR * 0.92

  const faceShade = mix(def.figure, SKIN_TONES[def.skinTone], FACE_SKIN_MIX)
  ctx.fillStyle = faceShade
  ctx.beginPath()
  ctx.ellipse(headX, headY, layout.jawHalfW, faceHalfH, 0, 0, Math.PI * 2)
  ctx.fill()

  paintKeyShade(ctx, headX, headY, layout.jawHalfW, faceHalfH, def.keyHardness)
  paintBrowRidge(ctx, headX, headY, headR, layout)
  paintNose(ctx, headX, headY, headR, layout)
  paintCheekbones(ctx, headX, headY, headR, layout)
  paintMouth(ctx, headX, headY, headR, layout)
  paintChinAndJaw(ctx, headX, headY, headR, layout.jawHalfW, layout)

  drawAgeLines(ctx, def, headX, headY, headR)
}

/**
 * Nasolabial lines, absent on the young, faint at middle age, and cut deep
 * on the old — the cheapest way to put forty years between two characters
 * who otherwise share a build.
 */
function drawAgeLines(
  ctx: CanvasRenderingContext2D,
  def: PortraitDef,
  headX: number, headY: number, headR: number,
): void {
  if (def.age === 'young') return
  const weight = def.age === 'old' ? 0.38 : 0.16

  ctx.strokeStyle = `rgba(0,0,0,${weight})`
  ctx.lineWidth = Math.max(1, headR * 0.03)
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(headX + side * headR * 0.3, headY + headR * 0.26)
    ctx.quadraticCurveTo(
      headX + side * headR * 0.5, headY + headR * 0.42,
      headX + side * headR * 0.36, headY + headR * 0.58,
    )
    ctx.stroke()
  }
}
