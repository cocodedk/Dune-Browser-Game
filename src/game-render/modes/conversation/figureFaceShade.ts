// src/game-render/modes/conversation/figureFaceShade.ts
// The face itself, built from lit planes meeting shadowed planes — never
// from an outline. An outlined nose or mouth reads as a cartoon at this
// size; two triangles that disagree on brightness read as a ridge.
//
// Light is fixed upper-left across the whole cast, matching the rim light's
// "scene sun" direction in CharacterCard.ts: negative-x/negative-y is lit,
// positive-x/positive-y is in shadow. Every function below follows that
// convention so a face never looks lit from two directions at once.

import type { FaceLayout } from './figureFaceLayout'

/** One diagonal wash before any feature is drawn — cheekbone and jaw read as
 * much from this gradient as from any shape painted on top of it. Shadow
 * side is tinted blue-violet, not black, per the game's palette direction. */
export function paintKeyShade(
  ctx: CanvasRenderingContext2D,
  headX: number, headY: number, jawHalfW: number, faceHalfH: number, hardness: number,
): void {
  const grad = ctx.createLinearGradient(
    headX - jawHalfW, headY - faceHalfH, headX + jawHalfW * 0.6, headY + faceHalfH,
  )
  grad.addColorStop(0, `rgba(255, 224, 180, ${0.16 + hardness * 0.18})`)
  grad.addColorStop(0.5, 'rgba(255, 224, 180, 0)')
  grad.addColorStop(1, `rgba(30, 20, 55, ${0.22 + hardness * 0.2})`)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(headX, headY, jawHalfW, faceHalfH, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** Brow bone lit above, socket shadowed below — the two planes a flat brow
 * shadow ellipse never separated. `browTilt` mirrors eyeTilt. */
export function paintBrowRidge(
  ctx: CanvasRenderingContext2D,
  headX: number, headY: number, headR: number, layout: FaceLayout,
): void {
  const cy = headY + layout.browY
  ctx.save()
  ctx.translate(headX, cy)
  ctx.rotate(layout.browTilt)
  ctx.fillStyle = 'rgba(255, 214, 170, 0.22)'
  ctx.beginPath()
  ctx.ellipse(0, -headR * 0.05, layout.browHalfW, headR * 0.11, 0, Math.PI, 0)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = `rgba(18, 12, 32, ${0.34 + layout.ageHollow * 0.18})`
  ctx.beginPath()
  ctx.ellipse(headX, cy + headR * 0.14, layout.browHalfW * 0.92, headR * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** A nose is one lit plane and one shadowed plane meeting at the bridge —
 * built as two triangles sharing an edge, plus an underside shadow that
 * seats it on the face instead of leaving it floating over the mouth. */
export function paintNose(
  ctx: CanvasRenderingContext2D,
  headX: number, headY: number, headR: number, layout: FaceLayout,
): void {
  const topY = headY + layout.noseTopY
  const tipY = headY + layout.noseTipY
  const hw = layout.noseHalfW
  const ridgeX = headX
  const ridgeY = tipY + headR * 0.05

  ctx.fillStyle = 'rgba(255, 220, 180, 0.28)'
  ctx.beginPath()
  ctx.moveTo(headX - hw * 0.15, topY)
  ctx.lineTo(headX - hw, tipY)
  ctx.lineTo(ridgeX, ridgeY)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = 'rgba(16, 10, 28, 0.4)'
  ctx.beginPath()
  ctx.moveTo(headX + hw * 0.15, topY)
  ctx.lineTo(headX + hw, tipY)
  ctx.lineTo(ridgeX, ridgeY)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = 'rgba(10, 6, 20, 0.32)'
  ctx.beginPath()
  ctx.ellipse(headX, ridgeY + headR * 0.02, hw * 1.1, headR * 0.06, 0, 0, Math.PI)
  ctx.fill()
}

/** Lit cheek toward the temple on the key-light side; a hollow on the far
 * side that `ageHollow` deepens for a gaunt elder and barely shows on the
 * young. */
export function paintCheekbones(
  ctx: CanvasRenderingContext2D,
  headX: number, headY: number, headR: number, layout: FaceLayout,
): void {
  const cy = headY + layout.cheekY
  const litCx = headX - layout.cheekHalfW * 0.5
  const litCy = cy - headR * 0.1
  const lit = ctx.createRadialGradient(litCx, litCy, 0, litCx, litCy, layout.cheekHalfW * 0.9)
  lit.addColorStop(0, 'rgba(255, 220, 180, 0.26)')
  lit.addColorStop(1, 'rgba(255, 220, 180, 0)')
  ctx.fillStyle = lit
  ctx.beginPath()
  ctx.ellipse(litCx, litCy, layout.cheekHalfW * 0.9, headR * 0.34, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = `rgba(18, 12, 34, ${0.16 + layout.ageHollow * 0.24})`
  ctx.beginPath()
  ctx.ellipse(
    headX + layout.cheekHalfW * 0.55, cy + headR * 0.06,
    layout.cheekHalfW * 0.75, headR * 0.3, 0, 0, Math.PI * 2,
  )
  ctx.fill()
}

/** A seam plus a lower-lip catchlight — without the catchlight the seam
 * alone reads as a scar, not a mouth. */
export function paintMouth(
  ctx: CanvasRenderingContext2D,
  headX: number, headY: number, headR: number, layout: FaceLayout,
): void {
  const y = headY + layout.mouthY

  ctx.strokeStyle = 'rgba(14, 8, 20, 0.55)'
  ctx.lineWidth = Math.max(1.2, headR * 0.035)
  ctx.beginPath()
  ctx.moveTo(headX - layout.mouthHalfW, y)
  ctx.quadraticCurveTo(headX, y + headR * 0.05, headX + layout.mouthHalfW, y)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(255, 210, 180, 0.22)'
  ctx.lineWidth = Math.max(1, headR * 0.025)
  ctx.beginPath()
  ctx.moveTo(headX - layout.mouthHalfW * 0.6, y + headR * 0.08)
  ctx.quadraticCurveTo(headX, y + headR * 0.13, headX + layout.mouthHalfW * 0.6, y + headR * 0.08)
  ctx.stroke()
}

/** A lit chin boss so the jaw doesn't dead-end at the mouth, a traced
 * jawline (the line a flat oval never had), and jowl weight for heavy or
 * older builds. */
export function paintChinAndJaw(
  ctx: CanvasRenderingContext2D,
  headX: number, headY: number, headR: number, jawHalfW: number, layout: FaceLayout,
): void {
  const chinCy = headY + layout.chinY

  ctx.fillStyle = 'rgba(255, 216, 176, 0.2)'
  ctx.beginPath()
  ctx.ellipse(headX, chinCy, layout.chinHalfW, headR * 0.14, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(12, 8, 24, 0.3)'
  ctx.lineWidth = Math.max(1, headR * 0.05)
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(headX + side * jawHalfW * 0.92, headY + headR * 0.1)
    ctx.quadraticCurveTo(
      headX + side * jawHalfW * 0.7, chinCy + headR * 0.05,
      headX + side * layout.chinHalfW * 1.1, chinCy + headR * 0.02,
    )
    ctx.stroke()
  }

  if (layout.jowlStrength <= 0.05) return
  ctx.fillStyle = `rgba(10, 6, 20, ${Math.min(0.32, layout.jowlStrength * 0.3)})`
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(
      headX + side * jawHalfW * 0.6, headY + headR * 0.5,
      jawHalfW * 0.32, headR * 0.22, side * 0.3, 0, Math.PI * 2,
    )
    ctx.fill()
  }
}
