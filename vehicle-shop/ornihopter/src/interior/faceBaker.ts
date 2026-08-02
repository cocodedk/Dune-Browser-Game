// vehicle-shop/ornihopter/src/interior/faceBaker.ts
// One painter-to-DataTexture baker, shared by every authored face in the
// cockpit: dialFaces.ts's analog dials and mfdFaces.ts's MFD pages.
//
// NOT a canvas, and that is load-bearing rather than stylistic. The unit suite
// runs in node with no `document`, and interior/Cockpit.test.ts builds the
// whole cockpit, so a CanvasTexture would take the suite down on import. Same
// house pattern as src/game-render/materials/neutralEnvMap.ts and
// model/geometry/hullWeathering.ts.
//
// It lived inside dialFaces.ts until round 9b, hard-wired to a 64px face. The
// MFD pages need four times the resolution (a moving-map page is route lines
// and tick rings, not a needle on a plate), so the size became a parameter and
// the function moved out rather than being copied with one number changed.

import {
  DataTexture, RGBAFormat, SRGBColorSpace, ClampToEdgeWrapping, LinearFilter,
  UnsignedByteType,
} from 'three'

export type RGB = readonly [number, number, number]

export interface Painter {
  /** nx/ny run -1..1 with the face centred, y UP (screen rows are flipped
   *  here, once, so no painter has to remember which way its own rows run). */
  (nx: number, ny: number): RGB
}

export function bakeFace(size: number, paint: Painter): DataTexture {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    const ny = 1 - ((y + 0.5) * 2) / size
    for (let x = 0; x < size; x++) {
      const nx = ((x + 0.5) * 2) / size - 1
      const [r, g, b] = paint(nx, ny)
      const i = (y * size + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

/** Perpendicular distance from p to the segment a-b, in the same -1..1 space
 *  the painters work in. The one primitive a page of route legs, bar gauges
 *  and scale rules is built out of. */
export function segmentDistance(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number {
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}
