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
