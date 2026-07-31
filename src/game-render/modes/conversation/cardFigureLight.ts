// src/game-render/modes/conversation/cardFigureLight.ts
// Lighting passes applied AFTER drawFigure, so light actually lands on the
// person instead of only ever touching the backdrop behind them (critic's
// Major 4), and a rim that separates the shadow side from a backdrop of the
// same value instead of outlining the side that is already lit a second
// time (critic's Major 5).

import type { PortraitDef } from '../../../data/portraits'
import { headSilhouette } from './figureSilhouette'
import { withAlpha } from './figureDetails'

/**
 * Shadow-side arc only. Canvas ellipse angle 0 is due right and angle grows
 * clockwise (y is down), so the upper-left key-lit quadrant this rim must
 * avoid is roughly (1.05π, 2π); this range covers everything else — right,
 * bottom, left — which is the shadow side the rim is meant to separate.
 */
export const RIM_ARC_START = Math.PI * 0.02
export const RIM_ARC_END = Math.PI * 1.05

/**
 * Where light lands on the figure itself: upper-left within the head,
 * matching the backdrop shaft's direction, clipped to the actual
 * silhouette so it can never spill onto the backdrop it was just kept off
 * of by paintEdgeDarken. This replaces the old wash that clipped to the
 * rim's full ellipse — the same job, but the rim now only traces a partial
 * arc (see paintRim), so this pass needs its own clip.
 */
export function paintFigureLightWash(
  ctx: CanvasRenderingContext2D, def: PortraitDef, headX: number, headY: number, headR: number,
): void {
  const { rx, ry, offsetY } = headSilhouette(def, headR)
  const cx = headX
  const cy = headY + offsetY
  const clip = new Path2D()
  clip.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)

  ctx.save()
  ctx.clip(clip)
  const wash = ctx.createRadialGradient(
    cx - rx * 0.55, cy - ry * 0.6, 0, cx - rx * 0.55, cy - ry * 0.6, rx * 1.6,
  )
  wash.addColorStop(0, `rgba(255, 220, 172, ${0.22 + def.keyHardness * 0.16})`)
  wash.addColorStop(1, 'rgba(255, 220, 172, 0)')
  ctx.fillStyle = wash
  ctx.fillRect(cx - rx * 2, cy - ry * 2, rx * 4, ry * 4)
  ctx.restore()
}

/**
 * The rim light: the character's single identifying accent, traced along
 * headSilhouette's outer edge for whatever headgear they wear. Flipped from
 * the old upper-left-bright gradient (Major 5): bright on the shadow side
 * (lower-right), fading toward the key-lit corner, so it reads as light
 * catching the far edge of the silhouette instead of a second highlight on
 * the side that paintFigureLightWash already lit.
 */
export function paintRim(
  ctx: CanvasRenderingContext2D, def: PortraitDef, headX: number, headY: number, headR: number,
): void {
  const { rx, ry, offsetY } = headSilhouette(def, headR)
  const rimCx = headX
  const rimCy = headY + offsetY

  const rimPath = new Path2D()
  rimPath.ellipse(rimCx, rimCy, rx, ry, 0, RIM_ARC_START, RIM_ARC_END)

  const rimGrad = ctx.createLinearGradient(
    rimCx + rx * 0.6, rimCy + ry * 0.6, rimCx - rx * 1.1, rimCy - ry * 1.1,
  )
  rimGrad.addColorStop(0, withAlpha(def.rim, 0.95))
  rimGrad.addColorStop(0.5, withAlpha(def.rim, 0.35))
  rimGrad.addColorStop(1, withAlpha(def.rim, 0))
  ctx.strokeStyle = rimGrad
  ctx.lineWidth = 2.5 + def.keyHardness * 3.5
  ctx.stroke(rimPath)
}
