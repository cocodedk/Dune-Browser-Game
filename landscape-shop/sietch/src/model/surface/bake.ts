// landscape-shop/sietch/src/model/surface/bake.ts
// One baker for every map in the set. It walks a texture grid, asks
// worldAt() where in the hall that texel actually is, asks sample.ts what
// the rock looks like there, and writes three byte arrays: sRGB albedo,
// a tangent-space normal differentiated from the sampled height field,
// and roughness.
//
// DataTexture only, by the house rule — no canvas, no DOM, no WebGL — so
// the whole surface layer runs in node and surface.test.ts can measure
// the real bytes the renderer will upload rather than a stand-in.
//
// worldAt() takes INTEGER texel coordinates, not normalised ones, and the
// grid is walked row by row, so a caller whose world lookup is expensive
// (the shell's, which has to build a cross-section ring per row) can
// cache on the row index and pay for it once.

import type { RockSample } from './sample'
import { clamp01 } from './curves'

export interface BakedMaps {
  map: Uint8Array
  normalMap: Uint8Array
  roughnessMap: Uint8Array
  width: number
  height: number
}

export interface BakeSpec {
  width: number
  height: number
  worldAt(col: number, row: number): [number, number, number]
  sample(x: number, y: number, z: number): RockSample
  /** Metres per texel across and down — the scale the height field is
   *  differentiated at. Get this wrong and the relief is the right shape
   *  at the wrong strength. */
  metresPerTexel: [number, number]
}

function linearToSRGB(c: number): number {
  const x = clamp01(c)
  return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055
}

function byte(x: number): number {
  return Math.max(0, Math.min(255, Math.round(x * 255)))
}

export function bakeSurface(spec: BakeSpec): BakedMaps {
  const { width, height } = spec
  const count = width * height
  const albedo = new Float32Array(count * 3)
  const rough = new Float32Array(count)
  const relief = new Float32Array(count)

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const [x, y, z] = spec.worldAt(col, row)
      const s = spec.sample(x, y, z)
      const i = row * width + col
      albedo[i * 3] = s.r
      albedo[i * 3 + 1] = s.g
      albedo[i * 3 + 2] = s.b
      rough[i] = s.roughness
      relief[i] = s.height
    }
  }

  const map = new Uint8Array(count * 4)
  const normalMap = new Uint8Array(count * 4)
  const roughnessMap = new Uint8Array(count * 4)
  const [metresX, metresY] = spec.metresPerTexel
  const at = (col: number, row: number): number =>
    relief[Math.min(height - 1, Math.max(0, row)) * width + Math.min(width - 1, Math.max(0, col))]

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = row * width + col
      const o = i * 4
      map[o] = byte(linearToSRGB(albedo[i * 3]))
      map[o + 1] = byte(linearToSRGB(albedo[i * 3 + 1]))
      map[o + 2] = byte(linearToSRGB(albedo[i * 3 + 2]))
      map[o + 3] = 255

      const dx = (at(col + 1, row) - at(col - 1, row)) / (2 * metresX)
      const dy = (at(col, row + 1) - at(col, row - 1)) / (2 * metresY)
      const length = Math.hypot(dx, dy, 1)
      normalMap[o] = byte((-dx / length) * 0.5 + 0.5)
      normalMap[o + 1] = byte((-dy / length) * 0.5 + 0.5)
      normalMap[o + 2] = byte((1 / length) * 0.5 + 0.5)
      normalMap[o + 3] = 255

      const r = byte(rough[i])
      roughnessMap[o] = r
      roughnessMap[o + 1] = r
      roughnessMap[o + 2] = r
      roughnessMap[o + 3] = 255
    }
  }

  return { map, normalMap, roughnessMap, width, height }
}

/** Total bytes a baked set costs in texture memory, for the round report
 *  and for surface.test.ts's budget guard. */
export function bakedBytes(maps: BakedMaps, mapCount: number): number {
  return maps.width * maps.height * 4 * mapCount
}
