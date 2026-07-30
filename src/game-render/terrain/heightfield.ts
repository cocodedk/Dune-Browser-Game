// src/game-render/terrain/heightfield.ts
// PURE heightfield generation. Produces a Float32Array the mesh builder turns
// into geometry — no three.js here, so the terrain's shape is unit-testable.
//
// Dune character comes from mixing two signals: warped fBm for the large,
// curving forms, and a ridged transform for the sharp crest lines that make a
// dune read as a dune rather than as generic lumpy ground.

import { createNoiseField } from './noise'

export interface HeightfieldOptions {
  /** Vertices per side. 128 (low) / 192 (medium) / 256 (high). */
  resolution: number
  /** World units across the whole field. */
  worldSize: number
  seed: number
  /** Peak dune height in world units. */
  amplitude: number
  /** Noise frequency — lower means broader dunes. */
  frequency: number
  octaves?: number
  warpStrength?: number
  /** 0 = pure rolling fBm, 1 = pure sharp ridges. */
  ridgeMix?: number
  /**
   * Per-axis frequency scaling, [x, z]. Isotropic noise gives crumpled-paper
   * terrain; real dune fields are long ridges running perpendicular to the
   * prevailing wind. Stretching one axis is what turns noise into dunes.
   */
  stretch?: [number, number]
  /**
   * Fraction of each edge over which height ramps down to zero, 0..0.5.
   *
   * Without this the heightfield ends in a cliff, which the camera sees as a
   * flat plateau lip across the horizon. Ramping to zero lets the terrain meet
   * a distant ground plane seamlessly, so there is no boundary to hide.
   */
  edgeFalloff?: number
  /**
   * One rock wall running the field's width, near the v (row / +Z) edge —
   * Finding 3's landform, the fix for "no skyline shape ... horizon is a
   * featureless fog band". Undefined leaves the field pure dune.
   */
  escarpment?: EscarpmentOptions
}

export interface EscarpmentOptions {
  /** Distance from the v=1 edge, in the same 0..1 units as v, where the ridge crests. */
  edgeDistance: number
  /** Gaussian half-width of the ridge in the same units — how quickly it rises and falls. */
  falloffWidth: number
  /** Peak height as a multiple of `amplitude` — a wall reads as vast only if it dwarfs the dunes. */
  amplitudeMultiplier: number
  /** Frequency of the ridge's own along-the-wall undulation, in cycles per field width. Low: a wall is not a dune. */
  frequencyScale: number
  /** Fraction of each edge over which the ridge itself ramps to zero — independent of, and much smaller than, `edgeFalloff`, or the ridge would be crushed by the same taper that hides the dune field's border. */
  edgeTaper: number
}

export interface Heightfield {
  readonly resolution: number
  readonly worldSize: number
  /** resolution * resolution samples, row-major (z-major, x-minor). */
  readonly data: Float32Array
  readonly min: number
  readonly max: number
  /** Bilinear height sample at a world-space position, clamped to bounds. */
  heightAt(x: number, z: number): number
}

/**
 * Ridged transform: folds the signal at zero so troughs become sharp peaks.
 * Squaring afterwards widens the valleys and narrows the crests, which is the
 * asymmetry real dunes have between windward slope and slip face.
 */
function ridge(value: number): number {
  const folded = 1 - Math.abs(value)
  return folded * folded
}

/**
 * Weight in [0, 1] for a normalised coordinate, ramping to 0 within `falloff`
 * of either edge. Smoothstepped so the terrain eases into the flat rather than
 * meeting it at a visible crease.
 */
function edgeWeight(coord: number, falloff: number): number {
  if (falloff <= 0) return 1
  const f = Math.min(falloff, 0.5)
  const distance = Math.min(coord, 1 - coord)
  if (distance >= f) return 1
  const t = Math.max(0, distance / f)
  return t * t * (3 - 2 * t)
}

/**
 * Gaussian weight in [0, 1] peaking at `edgeDistance` in from the v=1 edge —
 * a ridge that rises out of the dune field and settles back toward the true
 * border on both sides, not a plateau with a crease at either end of it.
 */
export function escarpmentWeight(v: number, edgeDistance: number, falloffWidth: number): number {
  const width = Math.max(1e-6, falloffWidth)
  const t = ((1 - v) - edgeDistance) / width
  return Math.exp(-t * t)
}

export function generateHeightfield(options: HeightfieldOptions): Heightfield {
  const {
    resolution,
    worldSize,
    seed,
    amplitude,
    frequency,
    octaves = 5,
    warpStrength = 0.6,
    ridgeMix = 0.45,
    stretch = [1, 1],
    edgeFalloff = 0,
  } = options

  if (resolution < 2) throw new Error('heightfield resolution must be >= 2')
  if (worldSize <= 0) throw new Error('heightfield worldSize must be > 0')

  const field = createNoiseField(seed)
  const data = new Float32Array(resolution * resolution)

  let min = Infinity
  let max = -Infinity

  for (let row = 0; row < resolution; row++) {
    for (let col = 0; col < resolution; col++) {
      // Normalised 0..1 across the field, then scaled into noise space.
      const u = col / (resolution - 1)
      const v = row / (resolution - 1)
      const nx = u * frequency * stretch[0]
      const nz = v * frequency * stretch[1]

      const rolling = field.warpedFbm(nx, nz, octaves, warpStrength)
      const crests = ridge(field.fbm(nx * 1.7 + 3.1, nz * 1.7 + 7.9, Math.max(1, octaves - 1)))

      // rolling is [-1,1] and crests is [0,1]; map rolling to [0,1] first so
      // the mix does not bias the field downward.
      const combined = (1 - ridgeMix) * (rolling * 0.5 + 0.5) + ridgeMix * crests
      let height = combined * amplitude * edgeWeight(u, edgeFalloff) * edgeWeight(v, edgeFalloff)

      if (options.escarpment) {
        const esc = options.escarpment
        // Offset far from the dune terms' noise-space coordinates so this is
        // not just a taller copy of the same crest pattern, and no ridge()
        // fold at all — a wall is a smooth rock mass, not a folded dune.
        const shape = field.warpedFbm(u * esc.frequencyScale + 50, v * esc.frequencyScale + 90, 2, 0.3)
        height += (shape * 0.5 + 0.5) * amplitude * esc.amplitudeMultiplier
          * escarpmentWeight(v, esc.edgeDistance, esc.falloffWidth)
          * edgeWeight(u, esc.edgeTaper) * edgeWeight(v, esc.edgeTaper)
      }

      const index = row * resolution + col
      data[index] = height
      // Read back after storing: Float32Array truncates to float32, so
      // tracking the pre-store float64 value would leave min/max very slightly
      // inconsistent with the data callers actually sample.
      const stored = data[index]
      if (stored < min) min = stored
      if (stored > max) max = stored
    }
  }

  const half = worldSize / 2
  const cellSize = worldSize / (resolution - 1)

  function sampleAt(col: number, row: number): number {
    const c = Math.max(0, Math.min(resolution - 1, col))
    const r = Math.max(0, Math.min(resolution - 1, row))
    return data[r * resolution + c]
  }

  function heightAt(x: number, z: number): number {
    // World space is centred on the origin: -half..+half.
    const fx = (x + half) / cellSize
    const fz = (z + half) / cellSize

    const x0 = Math.floor(fx)
    const z0 = Math.floor(fz)
    const tx = fx - x0
    const tz = fz - z0

    const h00 = sampleAt(x0, z0)
    const h10 = sampleAt(x0 + 1, z0)
    const h01 = sampleAt(x0, z0 + 1)
    const h11 = sampleAt(x0 + 1, z0 + 1)

    const top = h00 + (h10 - h00) * tx
    const bottom = h01 + (h11 - h01) * tx
    return top + (bottom - top) * tz
  }

  return { resolution, worldSize, data, min, max, heightAt }
}
