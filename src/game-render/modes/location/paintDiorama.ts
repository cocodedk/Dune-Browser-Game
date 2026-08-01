// src/game-render/modes/location/paintDiorama.ts
// The painted backdrop for a location.
//
// Split from LocationMode once that file grew pointer handling and a hotspot
// layer. This is the art; LocationMode is the scene that hangs it.

import { CanvasTexture, LinearFilter, SRGBColorSpace, Color } from 'three'
import type { LocationKind } from '../../../types'
import { dioramaFor } from './locationDefs'

export const FRAME_WIDTH = 1600
export const FRAME_HEIGHT = 1000

/**
 * Multiply a hex colour's brightness. Keeps the pillars in the diorama's own
 * palette instead of introducing a second set of hand-picked hexes.
 */
function shade(hex: string, factor: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  const r = clamp(((n >> 16) & 255) * factor)
  const g = clamp(((n >> 8) & 255) * factor)
  const b = clamp((n & 255) * factor)
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Paint the diorama to a canvas.
 *
 * Canvas rather than geometry because the whole point is a painted backdrop;
 * building it from meshes would cost more and look worse.
 *
 * @param width  Pixels to paint. Pass the *visible* aspect, not the authored
 *   one, or the result has to be cropped to fit and most of the composition is
 *   thrown away — on a 2.39 ultrawide, cover-cropping a 1.60 painting cuts a
 *   third of its height and leaves the player looking at empty sky.
 */
export function paintDiorama(
  kind: LocationKind,
  name: string,
  tint: Color,
  width: number = FRAME_WIDTH,
  height: number = FRAME_HEIGHT,
): CanvasTexture {
  const def = dioramaFor(kind)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // Sky, warmed toward the hour so the diorama shares the map's clock.
  const sky = ctx.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, def.skyTop)
  sky.addColorStop(1, def.skyBottom)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  ctx.globalAlpha = 0.28
  ctx.fillStyle = `rgb(${Math.round(tint.r * 255)}, ${Math.round(tint.g * 255)}, ${Math.round(tint.b * 255)})`
  ctx.fillRect(0, 0, width, height)
  ctx.globalAlpha = 1

  // Hearth glow behind the massing — what makes an interior feel inhabited.
  if (def.hearth > 0) {
    const glow = ctx.createRadialGradient(
      width / 2, height * 0.62, 20,
      width / 2, height * 0.62, width * 0.45,
    )
    glow.addColorStop(0, `rgba(255, 176, 92, ${0.5 * def.hearth})`)
    glow.addColorStop(1, 'rgba(255, 176, 92, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, width, height)
  }

  // Foreground massing: an irregular silhouette framing the view. Drawn as one
  // path so the horizon reads as rock rather than as a rectangle.
  const baseY = height * (1 - def.enclosure * 0.55)
  ctx.fillStyle = def.massing
  ctx.beginPath()
  ctx.moveTo(0, height)
  ctx.lineTo(0, baseY)
  for (let x = 0; x <= width; x += width / 12) {
    const jag = Math.sin(x * 0.004) * 46 + Math.sin(x * 0.011) * 22
    ctx.lineTo(x, baseY + jag)
  }
  ctx.lineTo(width, height)
  ctx.closePath()
  ctx.fill()

  // Side pillars deepen the enclosure without another texture.
  //
  // These were flat fills of `def.massing`, and measured on a captured frame
  // the left one sat at mean luma 6.9 against 48.2 for the scene beside it —
  // an unlit, untextured, hard-edged column. It read as a rendering gap rather
  // than as a wall, and was reported as "a black strip" on the edge of the
  // screen. The right-hand one is the same, and only escaped notice because the
  // command column covers it.
  //
  // The shape was right; it just had nothing in it that says "stone". Each
  // pillar now falls off toward the frame edge rather than being one flat
  // value, and carries a lit inner lip where it turns to face the room — the
  // single cue that separates a near wall from a hole in the picture.
  const pillar = width * 0.09 * def.enclosure
  if (pillar > 4) {
    const lip = Math.max(3, pillar * 0.18)

    for (const side of [0, 1]) {
      const x = side === 0 ? 0 : width - pillar
      // Darkest at the frame edge, opening toward the room.
      const wash = ctx.createLinearGradient(x, 0, x + pillar, 0)
      const outer = side === 0 ? 0 : 1
      // Never below the flat value this replaced — the point is that the
      // column reads as a lit surface, not that it recedes further.
      wash.addColorStop(outer, shade(def.massing, 1.0))
      wash.addColorStop(1 - outer, shade(def.massing, 2.1))
      ctx.fillStyle = wash
      ctx.fillRect(x, 0, pillar, height)

      // The inner edge catches the hearth, so the column has a near face.
      ctx.fillStyle = shade(def.massing, 2.9)
      ctx.globalAlpha = 0.65
      ctx.fillRect(side === 0 ? pillar - lip : width - pillar, 0, lip, height)
      ctx.globalAlpha = 1
    }
  }

  ctx.fillStyle = 'rgba(240, 224, 190, 0.92)'
  ctx.font = '600 34px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(name, width / 2, 74)

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.colorSpace = SRGBColorSpace
  return texture
}
