// vehicle-shop/ornihopter/src/interior/dialFaces.ts
// Instrument faces, painted into Uint8Array buffers and handed to three as
// DataTextures. NOT a canvas: the unit suite runs in node with no `document`
// and interior/Cockpit.test.ts builds the whole cockpit, so a CanvasTexture
// would take the suite down. Same house pattern as
// model/geometry/hullWeathering.ts, which says the same thing at more length.
//
// WHY FACES AT ALL. Round 6's critic, on the shipped dash: "4 identical pastel
// slabs... no dials, no gauges, no needles, no nav globe". A 0.12 x 0.10 box
// with a flat colour cannot be a gauge at any distance — there is nothing on
// it to be read. A texture costs one 64x64 buffer per distinct face and buys
// a bezel, a tick ring, a red sector and a needle that points somewhere.
//
// The palette is .shots/reference/thopter-03.jpg's "ILLUMINATED LIGHTS" inset,
// sampled rather than invented: an ivory-on-charcoal face, a brass bezel, a
// dull red danger sector, and a green-grey nav globe with a bright graticule.

import {
  DataTexture, RGBAFormat, SRGBColorSpace, ClampToEdgeWrapping, LinearFilter,
  UnsignedByteType,
} from 'three'

const SIZE = 64

type RGB = readonly [number, number, number]

const PLATE: RGB = [96, 101, 92]
const FACE: RGB = [34, 37, 31]
const BEZEL: RGB = [150, 145, 118]
const MARK: RGB = [206, 200, 178]
const DANGER: RGB = [156, 70, 56]
const GLOBE: RGB = [74, 92, 74]
const GRAT: RGB = [176, 196, 168]

interface Painter {
  (nx: number, ny: number): RGB
}

/** nx/ny run -1..1 with the face centred, y up. */
function bake(paint: Painter): DataTexture {
  const data = new Uint8Array(SIZE * SIZE * 4)
  for (let y = 0; y < SIZE; y++) {
    const ny = 1 - ((y + 0.5) * 2) / SIZE
    for (let x = 0; x < SIZE; x++) {
      const nx = ((x + 0.5) * 2) / SIZE - 1
      const [r, g, b] = paint(nx, ny)
      const i = (y * SIZE + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  }
  const texture = new DataTexture(data, SIZE, SIZE, RGBAFormat, UnsignedByteType)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

/** Perpendicular distance from (nx, ny) to the ray from the origin at
 *  `angle`, or Infinity behind the hub — a needle, not a diameter. */
function needleDistance(nx: number, ny: number, angle: number, length: number): number {
  const dx = Math.sin(angle)
  const dy = Math.cos(angle)
  const along = nx * dx + ny * dy
  if (along < 0 || along > length) return Infinity
  return Math.abs(nx * dy - ny * dx)
}

export interface GaugeOptions {
  /** Needle bearing in degrees, 0 straight up, positive clockwise. */
  needleDeg: number
  /** Start of the red sector, same convention. Omit for no sector. */
  dangerFromDeg?: number
  ticks?: number
}

/**
 * A round gauge on a square plate: brass bezel, charcoal face, a tick ring, an
 * optional red sector at the top of the scale, and one needle.
 */
export function gaugeTexture({ needleDeg, dangerFromDeg, ticks = 9 }: GaugeOptions): DataTexture {
  const needle = (needleDeg * Math.PI) / 180
  const danger = dangerFromDeg === undefined ? undefined : (dangerFromDeg * Math.PI) / 180
  return bake((nx, ny) => {
    const r = Math.hypot(nx, ny)
    if (r > 0.94) return PLATE
    if (r > 0.78) {
      // Bezel, with a scale sector burned into its inner edge.
      const angle = Math.atan2(nx, ny)
      if (danger !== undefined && angle >= danger && angle <= (140 * Math.PI) / 180) return DANGER
      return BEZEL
    }
    if (needleDistance(nx, ny, needle, 0.66) < 0.045) return MARK
    if (r < 0.1) return MARK
    if (r > 0.6) {
      const angle = Math.atan2(nx, ny)
      const step = (280 / (ticks - 1)) * (Math.PI / 180)
      const from = (-140 * Math.PI) / 180
      const k = Math.round((angle - from) / step)
      if (k >= 0 && k < ticks && Math.abs(angle - (from + k * step)) < 0.055) return MARK
    }
    return FACE
  })
}

/**
 * The reference's nav globe, painted for a SPHERE rather than for a disc: an
 * equirectangular graticule, which is the one projection where a plain grid of
 * straight lines becomes a correct set of parallels and meridians once
 * three's default sphere UVs wrap it. Painting a disc and mapping it onto a
 * sphere would have smeared it round the poles.
 */
export function navGlobeTexture(): DataTexture {
  return bake((nx, ny) => {
    const lonDeg = nx * 180
    const latDeg = ny * 90
    const nearMeridian = Math.min(
      Math.abs(((lonDeg + 3600 + 15) % 30) - 15),
      Math.abs(lonDeg)
    ) < 2.4
    const nearParallel = Math.abs(((latDeg + 900 + 15) % 30) - 15) < 2.2
    if (nearMeridian || nearParallel) return GRAT
    // A landmass band and a terminator, so it reads as a body being lit
    // rather than as graph paper on a ball.
    const land = Math.sin(lonDeg * 0.05) + Math.cos(latDeg * 0.07) > 0.7
    const shade = nx < -0.45 ? 0.55 : 1
    const base = land ? ([94, 108, 78] as RGB) : GLOBE
    return [base[0] * shade, base[1] * shade, base[2] * shade] as RGB
  })
}

/**
 * A vertical tape instrument — the reference's rectangular gauges beside the
 * globe. Scale down one side, an index mark, no needle.
 */
export function tapeTexture(indexAt: number): DataTexture {
  return bake((nx, ny) => {
    if (Math.abs(nx) > 0.86 || Math.abs(ny) > 0.9) return PLATE
    if (Math.abs(nx) > 0.72) return BEZEL
    const index = indexAt * 2 - 1
    if (Math.abs(ny - index) < 0.07) return DANGER
    const rung = Math.abs((ny * 100) % 22) < 4.5
    if (rung && nx < -0.25) return MARK
    return FACE
  })
}
