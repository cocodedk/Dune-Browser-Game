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
      const height = combined * amplitude

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
