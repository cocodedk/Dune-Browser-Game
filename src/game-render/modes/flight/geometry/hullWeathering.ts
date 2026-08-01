// src/game-render/modes/flight/geometry/hullWeathering.ts
// Procedural bone/tan albedo + roughness maps for the hull: panel-line
// seams with dirt concentrated at them, replacing the flat single-colour
// albedo section 2.6 named ("uniform material... one hull colour, no
// wear"). The reference (.shots/reference/thopter-mr.jpg, mr-O4copy.jpg)
// is pale and plated, with grime collecting in the panel gaps rather than
// spread evenly.
//
// Built as a plain Uint8Array RGBA buffer -> DataTexture, the same no-DOM
// pattern skyEquirect.ts / neutralEnvMap.ts already use, NOT a
// document.createElement('canvas') CanvasTexture: Ornithopter.test.ts
// constructs the full craft with no GL context and no `document` (see that
// file's own header), so a CanvasTexture would throw there.
//
// Deterministic: every "noise" value is a fixed sine-hash of its pixel
// coordinate, never Math.random() — stage 22 section 2.6's warning against
// randomised greebling applies equally to a randomised texture, and a
// non-deterministic material would make every render-vs-reference
// comparison a moving target.

import {
  DataTexture, RGBAFormat, SRGBColorSpace, NoColorSpace, RepeatWrapping, UnsignedByteType, type Texture,
} from 'three'

const SIZE = 256
// Roughly fuselageGeometry.ts's own RADIAL_SEGMENTS cadence, so the painted
// seams have a chance of landing near the hull's real facet edges rather
// than crossing them at an unrelated frequency.
const PANEL_COLUMNS = 14
const PANEL_ROWS = 9
const SEAM_WIDTH = 0.035 // fraction of one panel cell's shorter span

// Round 5 follow-up: measured against criterion 3 (>=35% craft/sand
// separation at noon) the first pass of these tones fell short — see
// Ornithopter.ts's own comment and this round's report for the numbers.
// Pushed brighter here rather than pulled darker, deliberately: the
// reference (.shots/reference/thopter-mr.jpg) shows the clean panel faces
// as near-overexposed in direct sun, closer to a real aircraft skin at
// noon than to a mid-value tan. Dirt stays concentrated tight to the seams
// (see the narrower crevice falloff below) so the MAJORITY of the surface —
// the clean panel interior — carries this brighter tone into the average,
// rather than being pulled back down by a wide dirt halo.
const BONE: readonly [number, number, number] = [214, 200, 172]
const BONE_LIGHT: readonly [number, number, number] = [236, 224, 198]
const SEAM: readonly [number, number, number] = [90, 80, 63]
const DIRT: readonly [number, number, number] = [60, 51, 38]

/** Deterministic pseudo-random in [0, 1) — a fixed sine hash, never Math.random(). */
function hash01(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpRgb(
  a: readonly [number, number, number], b: readonly [number, number, number], t: number,
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

/** Fractional distance from (u, v) to the nearest panel seam line, in panel-cell units (0 = on the seam). */
function seamDistance(u: number, v: number): number {
  const colFrac = (u * PANEL_COLUMNS) % 1
  const rowFrac = (v * PANEL_ROWS) % 1
  const toCol = Math.min(colFrac, 1 - colFrac)
  const toRow = Math.min(rowFrac, 1 - rowFrac)
  return Math.min(toCol, toRow)
}

/**
 * One texel's albedo + roughness (0-1). Dirt concentrates near seams — the
 * `cavityBias` recipe in grimoire/build/geometry_patterns.md's Detail
 * Recipes ("stain... concentrate in crevices") — rather than spread evenly,
 * plus a coarse low-frequency mask so it does not read as a uniform tint.
 * This is a UV-space proxy for cavity darkening, not true per-vertex AO —
 * stated explicitly rather than left implicit.
 */
function texelAt(u: number, v: number): { albedo: [number, number, number]; roughness01: number } {
  const dist = seamDistance(u, v)
  const onSeam = dist < SEAM_WIDTH
  const patch = hash01(Math.floor(u * 11), Math.floor(v * 7)) > 0.8 ? 0.28 : 0
  const grain = hash01(Math.floor(u * SIZE), Math.floor(v * SIZE)) * 0.08
  // Narrower falloff than the first pass (SEAM_WIDTH*3, was *6): dirt reads
  // as a crisp accent right at the seam instead of a wide halo eating into
  // the clean panel around it.
  const crevice = Math.max(0, 1 - dist / (SEAM_WIDTH * 3))
  const dirt = Math.min(1, crevice * 0.65 + patch + grain)

  const boneTone = lerpRgb(BONE, BONE_LIGHT, hash01(Math.floor(u * 5), Math.floor(v * 5)))
  const base = onSeam ? SEAM : boneTone
  const albedo = lerpRgb(base, DIRT, dirt * (onSeam ? 0.55 : 0.28))
  const roughness01 = Math.min(1, 0.45 + dirt * 0.4 + (onSeam ? 0.15 : 0))
  return { albedo, roughness01 }
}

export interface HullWeatheringMaps {
  map: Texture
  roughnessMap: Texture
}

/**
 * Builds both maps from one pass over the texel grid. Same source content,
 * but two INDEPENDENT texture objects/buffers — never one aliased into the
 * other, per grimoire/build/threejs_texture_reference.md's "independent
 * channels" rule — because albedo wants sRGB and roughness wants linear
 * data, and a shared object could not carry both colour spaces at once.
 */
export function buildHullWeatheringMaps(): HullWeatheringMaps {
  const albedoData = new Uint8Array(SIZE * SIZE * 4)
  const roughData = new Uint8Array(SIZE * SIZE * 4)

  for (let y = 0; y < SIZE; y++) {
    const v = (y + 0.5) / SIZE
    for (let x = 0; x < SIZE; x++) {
      const u = (x + 0.5) / SIZE
      const { albedo, roughness01 } = texelAt(u, v)
      const i = (y * SIZE + x) * 4
      albedoData[i] = Math.round(albedo[0])
      albedoData[i + 1] = Math.round(albedo[1])
      albedoData[i + 2] = Math.round(albedo[2])
      albedoData[i + 3] = 255
      const r = Math.round(roughness01 * 255)
      roughData[i] = r
      roughData[i + 1] = r
      roughData[i + 2] = r
      roughData[i + 3] = 255
    }
  }

  const map = new DataTexture(albedoData, SIZE, SIZE, RGBAFormat, UnsignedByteType)
  map.colorSpace = SRGBColorSpace
  map.wrapS = map.wrapT = RepeatWrapping
  map.needsUpdate = true

  const roughnessMap = new DataTexture(roughData, SIZE, SIZE, RGBAFormat, UnsignedByteType)
  roughnessMap.colorSpace = NoColorSpace
  roughnessMap.wrapS = roughnessMap.wrapT = RepeatWrapping
  roughnessMap.needsUpdate = true

  return { map, roughnessMap }
}
