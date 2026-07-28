// src/game-render/modes/conversation/figureDetails.ts
// The details that say who someone is: eyes and dress.
//
// Split from drawFigure because the silhouette and the identifying marks are
// separate decisions — the hood is the same for everyone, the eyes are not.

import type { PortraitDef } from '../../../data/portraits'

/**
 * The eyes of Ibad: total blue, sclera and all, from a life on spice. It is
 * the one detail everybody remembers, so the Fremen get it and nobody else.
 */
export function drawEyes(
  ctx: CanvasRenderingContext2D,
  def: PortraitDef,
  headX: number, headY: number, headR: number,
): void {
  const ibad = def.dress === 'fremen'
  const eyeY = headY - headR * 0.1
  const dx = headR * 0.32
  const rx = headR * 0.17
  const ry = headR * 0.1

  for (const side of [-1, 1]) {
    if (ibad) {
      // A glow behind the eye is what sells "lit from within" at this size.
      const glow = ctx.createRadialGradient(
        headX + side * dx, eyeY, 0, headX + side * dx, eyeY, rx * 3.4,
      )
      glow.addColorStop(0, 'rgba(90, 200, 235, 0.55)')
      glow.addColorStop(1, 'rgba(90, 200, 235, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(headX + side * dx, eyeY, rx * 3.4, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = ibad ? '#3fa8d8' : 'rgba(28, 18, 10, 0.9)'
    ctx.beginPath()
    ctx.ellipse(headX + side * dx, eyeY, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Stillsuit tubing for Fremen, a high formal collar for nobles. */
export function drawDress(
  ctx: CanvasRenderingContext2D,
  def: PortraitDef,
  headX: number, shoulderY: number, headR: number,
): void {
  if (def.dress === 'fremen') {
    // Nose tube and catchpocket line: two strokes, and the silhouette is
    // unmistakably a stillsuit.
    ctx.strokeStyle = mix(def.figure, '#8a7a63', 0.62)
    ctx.lineWidth = Math.max(2, headR * 0.09)
    ctx.beginPath()
    ctx.moveTo(headX - headR * 0.2, shoulderY - headR * 0.75)
    ctx.quadraticCurveTo(
      headX - headR * 0.85, shoulderY - headR * 0.2,
      headX - headR * 0.6, shoulderY + headR * 0.6,
    )
    ctx.stroke()

    // Chest seam, curved with the body. Drawn straight it read as a stray
    // line ruled across the figure rather than as part of the suit.
    ctx.beginPath()
    ctx.moveTo(headX - headR * 0.82, shoulderY + headR * 0.12)
    ctx.quadraticCurveTo(
      headX, shoulderY + headR * 0.42,
      headX + headR * 0.82, shoulderY + headR * 0.12,
    )
    ctx.stroke()
    return
  }

  if (def.dress === 'noble') {
    // A standing collar: rank, drawn as two straight rising edges.
    ctx.strokeStyle = mix(def.figure, '#e8d8b8', 0.5)
    ctx.lineWidth = Math.max(2, headR * 0.08)
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(headX + side * headR * 0.55, shoulderY + headR * 0.85)
      ctx.lineTo(headX + side * headR * 1.15, shoulderY - headR * 0.35)
      ctx.stroke()
    }
  }
}

/** Blend two hex colours. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseHex(a)
  const pb = parseHex(b)
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}
