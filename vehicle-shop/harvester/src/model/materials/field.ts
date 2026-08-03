// vehicle-shop/harvester/src/model/materials/field.ts
// The scalar fields the texel authors draw with: interpolation, a ridge
// profile for a drawn line, and ONE deterministic dust field. Pure numbers —
// no three.js, no DOM — so every texture built on top of them is reproducible
// byte for byte, which materials.test.ts asserts.
//
// The dust field is deliberately the ONLY random-looking term in the whole
// weathering set, and its amplitude is small. Jitter is not detail: the panel
// lines, the joint dirt and the downward grime are all AUTHORED from where
// the machine's plates actually meet and where dust would actually settle.
// This field exists for one thing — breaking the dead uniformity of a
// flat-shaded 19 m plate — and it is scaled so it can never read as texture
// in its own right.

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

/** Hermite ramp from 0 at `edge0` to 1 at `edge1`. Works in either direction:
 *  smoothstep(0.55, 0.05, v) ramps UP as v falls, which is how the downward
 *  grime term is written. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** 1 at the centre of a drawn line, 0 beyond `half`. `distance` is how far
 *  the texel is from the line's centreline in UV. */
export function ridge(distance: number, half: number): number {
  return 1 - smoothstep(0, half, distance)
}

/** Deterministic lattice hash in [0,1). Not cryptographic and not meant to
 *  be: it must only be stable across runs and platforms, which a sine hash
 *  on integer inputs is. */
function hash(ix: number, iy: number): number {
  const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453
  return s - Math.floor(s)
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const wx = fx * fx * (3 - 2 * fx)
  const wy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy)
  const b = hash(ix + 1, iy)
  const c = hash(ix, iy + 1)
  const d = hash(ix + 1, iy + 1)
  return (a + (b - a) * wx) * (1 - wy) + (c + (d - c) * wx) * wy
}

/** Two octaves of dust film over a face, in [0,1]. Low frequency so it reads
 *  as uneven soiling across a plate rather than as noise on it. */
export function dustField(u: number, v: number): number {
  return 0.62 * valueNoise(u * 6, v * 6) + 0.38 * valueNoise(u * 17, v * 17)
}
