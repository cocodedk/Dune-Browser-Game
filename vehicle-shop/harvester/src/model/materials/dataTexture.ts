// vehicle-shop/harvester/src/model/materials/dataTexture.ts
// The buffers, the colour spaces and the DataTexture objects. plateTexel.ts
// decides what a texel looks like; this file only writes it down.
//
// Plain Uint8Array RGBA -> DataTexture, NEVER a
// document.createElement('canvas') CanvasTexture. seam.test.ts constructs the
// whole machine through createHarvester(), and the unit suite runs in node
// with no GL context and no `document`, so a CanvasTexture here would take the
// entire suite down. This is the ornithopter shop's house pattern
// (src/model/geometry/hullWeathering.ts there, materials/neutralEnvMap.ts in
// the game tree before it), copied rather than imported because this shop
// depends on neither tree.

import {
  ClampToEdgeWrapping, DataTexture, LinearFilter, LinearMipmapLinearFilter,
  NoColorSpace, RGBAFormat, SRGBColorSpace, UnsignedByteType, type Texture,
} from 'three'
import type { Texel } from './plateTexel'
import type { Rgb } from './palette'

export type TexelFn = (u: number, v: number) => Texel

export interface WeatheringMaps {
  map: DataTexture
  /** Absent when the caller asked for albedo only — a 0.5 m belt link has no
   *  room to show a roughness break, and a second buffer for it is waste. */
  roughnessMap?: DataTexture
  /** Everything allocated here. A Material's own dispose() does NOT release
   *  the textures bound to it, so the caller has to hold these. */
  textures: Texture[]
}

function finish(texture: DataTexture, srgb: boolean): DataTexture {
  texture.colorSpace = srgb ? SRGBColorSpace : NoColorSpace
  // Clamped, never repeating: every map here is authored in ONE face's 0..1
  // UV square, so wrapping would fold a plate's far border onto its near one.
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

/** One pass over the texel grid, producing an albedo map and (optionally) a
 *  roughness map. Two INDEPENDENT buffers and objects, never one aliased into
 *  the other: albedo wants sRGB and roughness wants linear data, and one
 *  object cannot carry both colour spaces. */
export function buildMaps(size: number, texelAt: TexelFn, withRoughness = true): WeatheringMaps {
  const albedo = new Uint8Array(size * size * 4)
  const rough = withRoughness ? new Uint8Array(size * size * 4) : null

  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size
      const texel = texelAt(u, v)
      const i = (y * size + x) * 4
      albedo[i] = clampByte(texel.rgb[0])
      albedo[i + 1] = clampByte(texel.rgb[1])
      albedo[i + 2] = clampByte(texel.rgb[2])
      albedo[i + 3] = 255
      if (rough) {
        const r = clampByte(texel.rough * 255)
        rough[i] = r
        rough[i + 1] = r
        rough[i + 2] = r
        rough[i + 3] = 255
      }
    }
  }

  const map = finish(new DataTexture(albedo, size, size, RGBAFormat, UnsignedByteType), true)
  const textures: Texture[] = [map]
  let roughnessMap: DataTexture | undefined
  if (rough) {
    roughnessMap = finish(new DataTexture(rough, size, size, RGBAFormat, UnsignedByteType), false)
    textures.push(roughnessMap)
  }
  return { map, roughnessMap, textures }
}

function clampByte(x: number): number {
  const r = Math.round(x)
  return r < 0 ? 0 : r > 255 ? 255 : r
}

/** Anything whose image is an RGBA byte grid: a DataTexture built here, or the
 *  same object read back off a Material as the plain `Texture` three.js types
 *  it. Structural, so a test can sample either without a cast. */
export interface ReadableTexture {
  image: { width: number; data: ArrayLike<number> | null }
}

/** Narrow a Material's `map` — which three.js types as Texture<unknown>, its
 *  image included — back to something samplable, checking rather than
 *  asserting. Used by the tests to read the map a material is actually
 *  carrying, not a second copy built beside it. */
export function asReadable(texture: unknown): ReadableTexture {
  const candidate = texture as ReadableTexture | null | undefined
  if (!candidate || !candidate.image || typeof candidate.image.width !== 'number') {
    throw new Error('not a readable data texture')
  }
  return candidate
}

/** Nearest-texel albedo read, for the tests. Takes UV, not texel indices, so
 *  a test can ask "what colour is the surface AT this point of the plate"
 *  in the same coordinates the geometry samples it in. */
export function sampleAlbedo(texture: ReadableTexture, u: number, v: number): Rgb {
  const size = texture.image.width
  const data = texture.image.data
  if (!data) throw new Error('texture has no readable image data')
  const x = Math.min(size - 1, Math.max(0, Math.floor(u * size)))
  const y = Math.min(size - 1, Math.max(0, Math.floor(v * size)))
  const i = (y * size + x) * 4
  return [data[i], data[i + 1], data[i + 2]]
}

/** Nearest-texel roughness read, 0..1. */
export function sampleRoughness(texture: ReadableTexture, u: number, v: number): number {
  return sampleAlbedo(texture, u, v)[0] / 255
}
