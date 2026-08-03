// vehicle-shop/ornihopter/src/hud/surface.ts
// A tiny RGBA raster and the DataTexture that carries it to the glass.
//
// WHY NOT interior/faceBaker.ts. That baker asks a painter for a colour at
// every texel, which is right for a dial face (a field of contours, a gradient,
// a wedge) and wrong for symbology, which is lines and glyphs on transparent
// black: a per-texel callback would evaluate "am I inside any of forty line
// segments" 400,000 times per repaint to light a few thousand texels. This
// draws instead of tests — clear, then stamp — and the cost is the ink, not
// the canvas.
//
// It also carries ALPHA, which faceBaker deliberately does not: an MFD page is
// an opaque screen, symbology is a transparency the desert shows through.
//
// ROWS RUN TOP-DOWN for the caller and are STORED bottom-up, once, here. A
// DataTexture's row 0 lands at v = 0, which is the BOTTOM of a plane, so a
// painter that writes its title at row 0 gets it upside down at the bottom of
// the glass. flipY is not a reliable fix for a typed-array upload, so the flip
// is arithmetic and every painter above this file can think in screen rows.

import {
  DataTexture, RGBAFormat, UnsignedByteType, SRGBColorSpace,
  ClampToEdgeWrapping, LinearFilter,
} from 'three'
import type { Ink } from './palette'

export interface Surface {
  readonly w: number
  readonly h: number
  readonly data: Uint8Array
  clear(): void
  dot(x: number, y: number, ink: Ink): void
  fill(x: number, y: number, w: number, h: number, ink: Ink): void
  hLine(x0: number, x1: number, y: number, ink: Ink, weight?: number): void
  vLine(x: number, y0: number, y1: number, ink: Ink, weight?: number): void
  frame(x: number, y: number, w: number, h: number, ink: Ink): void
}

export function createSurface(w: number, h: number): Surface {
  const data = new Uint8Array(w * h * 4)

  const dot = (x: number, y: number, ink: Ink): void => {
    const px = x | 0
    const py = y | 0
    if (px < 0 || py < 0 || px >= w || py >= h) return
    const i = ((h - 1 - py) * w + px) * 4
    data[i] = ink[0]
    data[i + 1] = ink[1]
    data[i + 2] = ink[2]
    data[i + 3] = 255
  }

  const fill = (x: number, y: number, fw: number, fh: number, ink: Ink): void => {
    for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) dot(x + i, y + j, ink)
  }

  return {
    w,
    h,
    data,
    clear() {
      data.fill(0)
    },
    dot,
    fill,
    hLine(x0, x1, y, ink, weight = 1) {
      const lo = Math.min(x0, x1)
      fill(lo, y, Math.abs(x1 - x0) + 1, weight, ink)
    },
    vLine(x, y0, y1, ink, weight = 1) {
      const lo = Math.min(y0, y1)
      fill(x, lo, weight, Math.abs(y1 - y0) + 1, ink)
    },
    frame(x, y, fw, fh, ink) {
      fill(x, y, fw, 1, ink)
      fill(x, y + fh - 1, fw, 1, ink)
      fill(x, y, 1, fh, ink)
      fill(x + fw - 1, y, 1, fh, ink)
    },
  }
}

/** The texture a Surface is shown through. Nearest-neighbour would alias the
 *  one-texel line-work into a crawling mess as the ladder slides, so this is
 *  linear and the ink is drawn two texels thick where it has to survive. */
export function surfaceTexture(surface: Surface): DataTexture {
  const texture = new DataTexture(
    surface.data, surface.w, surface.h, RGBAFormat, UnsignedByteType
  )
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}
