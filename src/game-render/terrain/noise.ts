// src/game-render/terrain/noise.ts
// PURE seeded gradient noise + fBm. No three.js, no globals, no Math.random.
//
// Determinism matters twice over: the same seed must produce the same Arrakis
// across reloads and across save/resume, and a pure function is testable
// without a GL context.

/** Deterministic 32-bit PRNG. Same seed, same stream, forever. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const GRAD_COUNT = 256

export interface NoiseField {
  /** 2D gradient noise in [-1, 1]. */
  noise2D(x: number, y: number): number
  /** Fractal Brownian motion in roughly [-1, 1]. */
  fbm(x: number, y: number, octaves?: number): number
  /** fBm with the input domain warped by fBm — this is what bends dune crests. */
  warpedFbm(x: number, y: number, octaves?: number, warpStrength?: number): number
}

function smootherstep(t: number): number {
  // 6t^5 - 15t^4 + 10t^3 — zero 1st and 2nd derivatives at the ends, so tiles
  // meet without visible seams or creasing.
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Build a seeded noise field.
 *
 * Uses a permutation table of unit gradient vectors — classic Perlin-style
 * gradient noise, which gives smoother, more dune-like ridges than value noise
 * and is cheap enough to evaluate per-vertex on a 256x256 grid.
 */
export function createNoiseField(seed: number): NoiseField {
  const rand = mulberry32(seed)

  const gradX = new Float32Array(GRAD_COUNT)
  const gradY = new Float32Array(GRAD_COUNT)
  for (let i = 0; i < GRAD_COUNT; i++) {
    const angle = rand() * Math.PI * 2
    gradX[i] = Math.cos(angle)
    gradY[i] = Math.sin(angle)
  }

  const perm = new Uint8Array(GRAD_COUNT * 2)
  const source = new Uint8Array(GRAD_COUNT)
  for (let i = 0; i < GRAD_COUNT; i++) source[i] = i
  // Fisher-Yates with the seeded stream.
  for (let i = GRAD_COUNT - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = source[i]
    source[i] = source[j]
    source[j] = tmp
  }
  for (let i = 0; i < GRAD_COUNT * 2; i++) perm[i] = source[i & (GRAD_COUNT - 1)]

  function dot(hash: number, dx: number, dy: number): number {
    const g = hash & (GRAD_COUNT - 1)
    return gradX[g] * dx + gradY[g] * dy
  }

  function noise2D(x: number, y: number): number {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = x - xi
    const yf = y - yi

    const gx = xi & (GRAD_COUNT - 1)
    const gy = yi & (GRAD_COUNT - 1)

    const aa = perm[perm[gx] + gy]
    const ab = perm[perm[gx] + gy + 1]
    const ba = perm[perm[gx + 1] + gy]
    const bb = perm[perm[gx + 1] + gy + 1]

    const u = smootherstep(xf)
    const v = smootherstep(yf)

    const x1 = lerp(dot(aa, xf, yf), dot(ba, xf - 1, yf), u)
    const x2 = lerp(dot(ab, xf, yf - 1), dot(bb, xf - 1, yf - 1), u)

    // Gradient noise peaks near ±0.707 in 2D; scale to fill [-1, 1].
    return Math.max(-1, Math.min(1, lerp(x1, x2, v) * 1.4142))
  }

  function fbm(x: number, y: number, octaves = 5): number {
    let total = 0
    let amplitude = 1
    let frequency = 1
    let maxAmplitude = 0

    for (let i = 0; i < octaves; i++) {
      total += noise2D(x * frequency, y * frequency) * amplitude
      maxAmplitude += amplitude
      amplitude *= 0.5
      frequency *= 2
    }
    return maxAmplitude === 0 ? 0 : total / maxAmplitude
  }

  function warpedFbm(x: number, y: number, octaves = 5, warpStrength = 0.6): number {
    // Offsets keep the two warp lookups decorrelated; without them the domain
    // shears along the diagonal instead of curving.
    const wx = fbm(x + 5.2, y + 1.3, 3)
    const wy = fbm(x + 9.7, y + 4.8, 3)
    return fbm(x + wx * warpStrength, y + wy * warpStrength, octaves)
  }

  return { noise2D, fbm, warpedFbm }
}
