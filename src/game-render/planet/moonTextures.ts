// src/game-render/planet/moonTextures.ts
// The markings on the two moons of Arrakis.
//
// These are the whole reason to draw the moons at all. In the novel the Fremen
// read a human fist in the face of the first moon, and in the second they read
// the kangaroo mouse, muad'dib — which is where Paul gets his desert name. A
// pair of featureless grey spheres would be scenery; these are the sky the
// Fremen navigate and name themselves after.
//
// Drawn onto an equirectangular canvas, which is the UV layout SphereGeometry
// already uses, and placed on the leading face so the marking is turned toward
// the planet rather than hidden round the back.

import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'

const W = 512
const H = 256

function base(rock: string, shade: string): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = rock
  ctx.fillRect(0, 0, W, H)

  // Craters: deterministic, not random. A moon that reshuffles its own face
  // between reloads is a moon nobody can learn.
  let seed = 1337
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  for (let i = 0; i < 90; i++) {
    const r = 2 + rand() * 13
    ctx.globalAlpha = 0.10 + rand() * 0.16
    ctx.fillStyle = shade
    ctx.beginPath()
    ctx.arc(rand() * W, rand() * H, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  return ctx
}

function finish(ctx: CanvasRenderingContext2D): CanvasTexture {
  const texture = new CanvasTexture(ctx.canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.colorSpace = SRGBColorSpace
  return texture
}

/**
 * Krelln, the first moon: titanium-rich silicate rock, and the mare the Fremen
 * read as a closed human fist.
 */
export function drawKrelln(): CanvasTexture {
  const ctx = base('#8e857a', '#5f584f')

  // The fist. A blocky mass with four knuckles along the top and a thumb
  // folded across the front — read at a glance, not anatomy.
  const cx = W * 0.5
  const cy = H * 0.5
  ctx.fillStyle = 'rgba(58, 52, 46, 0.82)'

  ctx.beginPath()
  ctx.moveTo(cx - 52, cy - 6)
  for (let k = 0; k < 4; k++) {
    // Knuckles: four bumps across the back of the hand.
    ctx.arc(cx - 36 + k * 24, cy - 8, 13, Math.PI, 0)
  }
  ctx.lineTo(cx + 54, cy + 20)
  ctx.quadraticCurveTo(cx + 40, cy + 46, cx - 4, cy + 48)
  ctx.quadraticCurveTo(cx - 48, cy + 46, cx - 52, cy + 16)
  ctx.closePath()
  ctx.fill()

  // Thumb, folded across.
  ctx.beginPath()
  ctx.ellipse(cx - 34, cy + 22, 20, 11, -0.35, 0, Math.PI * 2)
  ctx.fill()

  // Wrist, running off toward the limb.
  ctx.beginPath()
  ctx.moveTo(cx + 30, cy + 40)
  ctx.lineTo(cx + 66, cy + 74)
  ctx.lineTo(cx + 20, cy + 62)
  ctx.closePath()
  ctx.fill()

  return finish(ctx)
}

/**
 * Arvon, the second moon: ice-rich and therefore pale, and marked with the
 * kangaroo mouse the Fremen call muad'dib.
 */
export function drawArvon(): CanvasTexture {
  const ctx = base('#b9bcc2', '#7d8189')

  const cx = W * 0.5
  const cy = H * 0.52
  ctx.fillStyle = 'rgba(70, 74, 82, 0.80)'

  // Body: a crouched haunch, heavier at the back like a jerboa's.
  ctx.beginPath()
  ctx.ellipse(cx + 6, cy + 4, 40, 27, -0.22, 0, Math.PI * 2)
  ctx.fill()

  // Head, forward and low.
  ctx.beginPath()
  ctx.ellipse(cx - 40, cy - 10, 19, 15, -0.3, 0, Math.PI * 2)
  ctx.fill()

  // The ears — outsized, which is the single detail that makes it a kangaroo
  // mouse rather than any other small animal.
  for (const lean of [-0.45, -0.05]) {
    ctx.beginPath()
    ctx.ellipse(cx - 46, cy - 34, 8, 20, lean, 0, Math.PI * 2)
    ctx.fill()
  }

  // Tail: long, thin, and tufted at the tip.
  ctx.strokeStyle = 'rgba(70, 74, 82, 0.80)'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(cx + 38, cy + 10)
  ctx.quadraticCurveTo(cx + 92, cy + 2, cx + 104, cy - 44)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(cx + 106, cy - 50, 9, 12, 0.2, 0, Math.PI * 2)
  ctx.fill()

  // Hind leg, folded under.
  ctx.beginPath()
  ctx.ellipse(cx + 16, cy + 26, 17, 10, 0.3, 0, Math.PI * 2)
  ctx.fill()

  return finish(ctx)
}
