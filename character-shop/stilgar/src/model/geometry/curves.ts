// character-shop/stilgar/src/model/geometry/curves.ts
// Pure number helpers for profile-driven sculpting: no three.js import, so
// the sculpt profiles stay trivially testable and readable as tables.
//
// R1 pass-3 (2026-08-05) method change: heads, beards, hoods and draped
// cloth are CONTINUOUS ORGANIC SURFACES, so every one of them is authored
// here as a small table of control rows that a smooth interpolant sweeps
// through — never as an assembly of analytic spheres and cones. Two rounds
// of "brow disc + nose ball + beard cone" results ruled the primitive
// approach out; these four functions are what replaces it.

/** Uniform Catmull-Rom through a control table, every column at once.
 *  `v` is 0..1 across the whole table (index-parameterised, so denser
 *  control rows automatically get denser output — that is how the face
 *  region ends up with more mesh rings than the cranium). */
export function catmull(key: readonly number[][], v: number): number[] {
  const n = key.length
  const s = Math.min(Math.max(v, 0), 1) * (n - 1)
  const i = Math.min(Math.floor(s), n - 2)
  const f = s - i
  const p0 = key[Math.max(i - 1, 0)]
  const p1 = key[i]
  const p2 = key[i + 1]
  const p3 = key[Math.min(i + 2, n - 1)]
  const out: number[] = []
  for (let c = 0; c < p1.length; c++) {
    const a = p0[c]
    const b = p1[c]
    const d = p2[c]
    const e = p3[c]
    out.push(0.5 * (2 * b + (d - a) * f
      + (2 * a - 5 * b + 4 * d - e) * f * f
      + (3 * b - a - 3 * d + e) * f * f * f))
  }
  return out
}

/** Blow a control table up into `count` evenly-parameterised rows. Callers
 *  keep the dense table around so that a mesh sampled by row index and a
 *  second mesh sampled by Y (the beard hanging off the head, say) read the
 *  SAME surface — a mismatch there is skin poking through hair. */
export function resample(key: readonly number[][], count: number): number[][] {
  const rows: number[][] = []
  for (let i = 0; i < count; i++) rows.push(catmull(key, i / (count - 1)))
  return rows
}

/** Linear lookup in a dense table whose column 0 ascends. Dense enough
 *  input makes the linear step invisible; the smoothness came from
 *  `resample`. */
export function lookupByKey(dense: readonly number[][], k: number): number[] {
  const last = dense.length - 1
  if (k <= dense[0][0]) return dense[0].slice()
  if (k >= dense[last][0]) return dense[last].slice()
  let lo = 0
  let hi = last
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (dense[mid][0] <= k) lo = mid
    else hi = mid
  }
  const span = dense[hi][0] - dense[lo][0]
  const f = span > 1e-12 ? (k - dense[lo][0]) / span : 0
  return dense[lo].map((v, c) => v + (dense[hi][c] - v) * f)
}

/** Smoothstep-eased lookup in a small key-ascending table — the shape
 *  language for feature envelopes (nose protrusion by height, beard
 *  fullness by angle). Flat outside the table's range on purpose: a
 *  feature must stop, not extrapolate. */
export function smoothTable(table: readonly number[][], k: number, col: number): number {
  const last = table.length - 1
  if (k <= table[0][0]) return table[0][col]
  if (k >= table[last][0]) return table[last][col]
  let i = 0
  while (i < last - 1 && table[i + 1][0] < k) i++
  const t = (k - table[i][0]) / (table[i + 1][0] - table[i][0])
  return table[i][col] + (table[i + 1][col] - table[i][col]) * t * t * (3 - 2 * t)
}

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x
}

/** exp(-(d/w)^2) — the blend kernel every face form uses. Gaussians blend
 *  by construction: two overlapping forms ADD into one surface instead of
 *  intersecting as two shapes, which is the whole point of the pass-3
 *  method change. */
export function bell(d: number, w: number): number {
  const t = d / w
  return Math.exp(-t * t)
}

/** exp(-|d/w|^n) — bell with a shoulder. n > 2 flattens the top and steepens
 *  the sides, which is the difference between a nose that is a soft mound
 *  and one with a dorsum and two side planes. Still smooth, so it still
 *  sums into neighbouring forms the way bell() does. */
export function superBell(d: number, w: number, n: number): number {
  return Math.exp(-Math.pow(Math.abs(d / w), n))
}

/** Hermite ease between two thresholds — used where a field must start from
 *  ZERO SLOPE rather than merely from zero. A linear ramp out of a flat
 *  region leaves a slope discontinuity, and a slope discontinuity on a
 *  smooth-shaded surface is a visible crease line. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/** 1 across the face, 0 past the temporal line — the lateral fade every WIDE
 *  horizontal form on this head now carries. A form authored as bell(|x|, w)
 *  with a 70 mm width runs unbroken from ear to ear, and a stack of those at
 *  similar amplitudes reads as corrugation rather than as anatomy however
 *  carefully each one is placed: three blind judges called it a deformation
 *  artifact. A crease that STOPS is a crease. */
export function temporal(ax: number, edge0: number, edge1: number): number {
  return 1 - smoothstep(edge0, edge1, ax)
}

/** A monotone reparameterisation of 0..1 that CROWDS mesh rings around `at`.
 *  Feed the result to lookupByKey and read column 1.
 *
 *  R2 pass 2 added this because two separate artifacts turned out to be the
 *  same bug: a surface authored at a finer scale than the rings sampling it.
 *  The face carried a 1.9 mm lid roll on 4.1 mm rings and rendered flat; the
 *  hood's arch closed with a vertical tangent on 7.6 mm rings and rendered as
 *  a 31 mm notch at the apex. Both are fixed by putting rings where the form
 *  is, rather than by spending them evenly over a surface that is mostly
 *  smooth.
 *
 *  It is the normalised integral of `1 + gain * bell(v - at, width)`, NOT a
 *  piecewise remap. A piecewise one places rings at a rate that jumps at its
 *  knots, and a jump in ring spacing draws a shading band across a
 *  smooth-shaded surface — the exact trap hood.ts documents for row spacing. */
export function crowdWarp(at: number, width: number, gain: number, n = 513): number[][] {
  const rows: number[][] = []
  const step = 1 / (n - 1)
  let cum = 0
  for (let i = 0; i < n; i++) {
    const v = i * step
    if (i > 0) cum += step * (1 + gain * (bell(v - at, width) + bell(v - step - at, width)) / 2)
    rows.push([cum, v])
  }
  for (const row of rows) row[0] /= cum
  return rows
}
