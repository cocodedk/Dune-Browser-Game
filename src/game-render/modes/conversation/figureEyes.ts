// src/game-render/modes/conversation/figureEyes.ts
// The eyes of Ibad, and the lash line every character gets regardless of
// dress. Split out of figureDetails.ts so this fix — the critic's Critical 1,
// "Stilgar reads as EVE from WALL-E" — has room to be commented without
// crowding beard/mark/dress in the same file.

import type { PortraitDef } from '../../../data/portraits'

export const EYE_DX_RATIO = 0.32
export const EYE_RX_RATIO = 0.17
export const EYE_RY_RATIO = 0.1

/**
 * Was rx*3.4 at alpha 0.55: at that size the two glows' edges reached past
 * each other (3.4 * 0.17 = 0.578 * headR, against a 0.32 * headR half-gap
 * between the eyes) and flooded the whole midface into one lit panel — the
 * "EVE from WALL-E" verdict. 1.6 keeps the glow's edge (0.272 * headR)
 * inside that half-gap, so each eye still reads as its own light source;
 * see the no-overlap test in figureEyes.test.ts.
 */
export const EYE_GLOW_RADIUS_RATIO = EYE_RX_RATIO * 1.6
export const EYE_GLOW_ALPHA = 0.3

/**
 * The eyes of Ibad: total blue, sclera and all, from a life on spice. It is
 * the one detail everybody remembers, so the Fremen get it and nobody else.
 *
 * `eyeTilt` rotates each ellipse about its own centre (mirrored so both eyes
 * slant the same emotional direction) and nudges it vertically — a cheap
 * lever that separates a fierce Naib from a friendly waterseller without
 * touching anything else on the face.
 */
export function drawEyes(
  ctx: CanvasRenderingContext2D,
  def: PortraitDef,
  headX: number, headY: number, headR: number,
): void {
  const ibad = def.dress === 'fremen'
  const eyeY = headY - headR * 0.1
  const dx = headR * EYE_DX_RATIO
  const rx = headR * EYE_RX_RATIO
  const ry = headR * EYE_RY_RATIO

  for (const side of [-1, 1]) {
    const cy = eyeY - side * def.eyeTilt * headR * 0.3
    const angle = side * def.eyeTilt
    const cx = headX + side * dx

    if (ibad) {
      const glowR = headR * EYE_GLOW_RADIUS_RATIO
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
      glow.addColorStop(0, `rgba(90, 200, 235, ${EYE_GLOW_ALPHA})`)
      glow.addColorStop(1, 'rgba(90, 200, 235, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = ibad ? '#3fa8d8' : 'rgba(28, 18, 10, 0.9)'
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, angle, 0, Math.PI * 2)
    ctx.fill()

    if (ibad) {
      // A darker ring over the flat fill — without an iris boundary the
      // glowing disc read as an LED rather than an eye lit from within.
      ctx.strokeStyle = 'rgba(20, 70, 100, 0.6)'
      ctx.lineWidth = Math.max(1, rx * 0.3)
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx * 0.72, ry * 0.72, angle, 0, Math.PI * 2)
      ctx.stroke()

      // One near-white catchlight, upper-left regardless of side (the
      // scene's key direction is fixed) — a wet, lit surface, not a
      // painted disc.
      ctx.fillStyle = 'rgba(255, 250, 240, 0.85)'
      ctx.beginPath()
      ctx.arc(cx - rx * 0.4, cy - ry * 0.5, Math.max(0.6, rx * 0.16), 0, Math.PI * 2)
      ctx.fill()
    }

    // Lash line: the eye's own dark extreme, on every character. Its
    // absence was one of the reasons the value hierarchy's darkest point
    // never landed on the face (critic's Critical 3).
    ctx.strokeStyle = 'rgba(10, 6, 8, 0.55)'
    ctx.lineWidth = Math.max(1, ry * 0.35)
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx * 1.05, ry * 1.05, angle, Math.PI * 1.05, Math.PI * 1.95)
    ctx.stroke()
  }
}
