// src/game-render/modes/conversation/figureHead.ts
// The face itself: skin tone, brow shadow, and the age lines that keep a
// Reverend Mother from sharing a face with a girl of seventeen.
//
// Split from drawFigure because the head is a decision about who someone is
// (skin, age, jaw), while drawFigure only cares where things sit on the card.

import type { PortraitDef } from '../../../data/portraits'
import { SKIN_TONES } from '../../../data/portraits'
import { mix } from './figureDetails'

/**
 * Face width relative to the old fixed 0.74 * headR. jaw runs roughly
 * 0.75 (ascetic) to 1.3 (heavy); dampened so the ellipse warps rather than
 * grotesques — a Baron and a Chani should still both read as heads.
 */
function jawWidth(headR: number, jaw: number): number {
  return headR * 0.74 * (0.7 + 0.3 * jaw)
}

/** Fill the face and lay the brow shadow the hood/scarf/cap relies on. */
export function drawHead(
  ctx: CanvasRenderingContext2D,
  def: PortraitDef,
  headX: number, headY: number, headR: number,
): void {
  const faceShade = mix(def.figure, SKIN_TONES[def.skinTone], 0.55)
  ctx.fillStyle = faceShade
  ctx.beginPath()
  ctx.ellipse(headX, headY, jawWidth(headR, def.jaw), headR * 0.92, 0, 0, Math.PI * 2)
  ctx.fill()

  // Brow shadow — the hood (or the eye socket itself, bare-headed) keeps the
  // upper face dark, which is the whole look.
  ctx.fillStyle = 'rgba(0,0,0,0.42)'
  ctx.beginPath()
  ctx.ellipse(headX, headY - headR * 0.34, headR * 0.74, headR * 0.5, 0, 0, Math.PI * 2)
  ctx.fill()

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
