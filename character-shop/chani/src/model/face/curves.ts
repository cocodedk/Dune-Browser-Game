// character-shop/chani/src/model/face/curves.ts
// The interpolation math the head sculpt is built from. Chani's own copy —
// character-shop/docs/gauntlet-loop.md forbids importing across shops, and
// the fence enforces it, so duplication is the accepted price of shop
// independence.
//
// Everything here exists so that facial features can be authored as TABLES
// and summed as smooth FIELDS. R1's method lesson was that stacked analytic
// primitives cannot pass this bar: a nose ball on a skull ball reads as a
// snowman at any radius. A Gaussian displacement of one continuous surface
// has no seam to see because there is no second mesh.

/** Unit Gaussian bump: 1 at d = 0, ~0.37 at d = w, ~0.02 at d = 2w.
 *  Every facial form in warp.ts/mouth.ts is a product of two of these — one
 *  across the face, one up it — so neighbouring forms blend instead of
 *  butting. */
export function bell(d: number, w: number): number {
  const t = d / w
  return Math.exp(-t * t)
}

/** A bell with two different sigmas, above and below its own centre. A
 *  symmetric Gaussian cannot express a form that is deep on one side and
 *  shallow on the other, and the eye socket is exactly that: hollow under
 *  the brow, FULL under the lash line. Pass 2's socket used one sigma for
 *  both, so the hollow it needs above the eye leaked 2.6mm of shadow into
 *  the cheek below it — which is a tear trough, and a tear trough is the
 *  single form that ages a face. */
export function bellSplit(d: number, wUp: number, wDown: number): number {
  return bell(d, d >= 0 ? wUp : wDown)
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Smoothstep from 0 at `from` to 1 at `to`; flat outside. Used as a MEDIAL
 *  GATE on the side-of-face forms.
 *
 *  MEASURED, and it is the cause of a defect two critics saw. The cheek arch
 *  and the malar pad are Gaussians centred 35-50mm off the centre line, and
 *  a Gaussian has no support — at the nose bridge their summed tails still
 *  push the surface forward 1.0mm, and they push it forward FASTER at
 *  |x| = 2mm than at |x| = 0. The nose's own ridge is a quartic
 *  super-Gaussian, which is FLAT on top and cannot fill that dip. The sum is
 *  a 0.13mm V-groove running down the middle of the bridge from the glabella
 *  to the tip: sharp, symmetric, and visible in the front AND the 3/4 frame
 *  exactly as reported. A cheekbone has no business displacing the bridge of
 *  a nose; this is what stops it. */
export function medial(ax: number, from: number, to: number): number {
  const t = clamp01((ax - from) / (to - from))
  return t * t * (3 - 2 * t)
}

function segment(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (
    2 * p1
    + (-p0 + p2) * t
    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
    + (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  )
}

/** Catmull-Rom through every column of `table`, parameterised on ROW INDEX:
 *  v = 0 is the first row, v = 1 the last. Row spacing is therefore the
 *  author's density control — rows crowded where the profile turns fast
 *  (chin, brow) get more mesh than rows across the flat cranium. */
export function catmull(table: readonly number[][], v: number): number[] {
  const n = table.length
  const s = clamp01(v) * (n - 1)
  const i = Math.min(Math.floor(s), n - 2)
  const t = s - i
  const r0 = table[Math.max(i - 1, 0)]
  const r1 = table[i]
  const r2 = table[i + 1]
  const r3 = table[Math.min(i + 2, n - 1)]
  return r1.map((_, c) => segment(r0[c], r1[c], r2[c], r3[c], t))
}

function bracket(table: readonly number[][], key: number): number {
  let i = 0
  while (i < table.length - 2 && table[i + 1][0] < key) i++
  return i
}

/** Linear lookup keyed on column 0 (which must ascend); clamped at both
 *  ends. Used to ask the head surface "where is the skin at THIS height?"
 *  — the question brows.ts and the hair shell both need answered against
 *  exactly the surface the mesher builds. */
export function lookupByKey(table: readonly number[][], key: number): number[] {
  const n = table.length
  if (key <= table[0][0]) return [...table[0]]
  if (key >= table[n - 1][0]) return [...table[n - 1]]
  const i = bracket(table, key)
  const a = table[i]
  const b = table[i + 1]
  const t = (key - a[0]) / (b[0] - a[0])
  return a.map((v, c) => v + (b[c] - v) * t)
}

/** Evaluate `table` at `count` evenly spaced positions along its rows, so a
 *  sparse authored table becomes a dense one that lookupByKey can bisect. */
export function resample(table: readonly number[][], count: number): number[][] {
  const out: number[][] = []
  for (let i = 0; i < count; i++) out.push(catmull(table, i / (count - 1)))
  return out
}

/** Column `col` interpolated smoothly against key column 0, and exactly 0
 *  outside the table's own key range — which is how a nose profile stops
 *  being a nose above the brow and below the lip instead of fading into a
 *  ridge down the whole face. Negative overshoot is clamped away: a
 *  Catmull-Rom through a table that starts and ends at 0 will dip below it
 *  otherwise, and a negative protrusion is a dent nobody authored. */
export function smoothTable(table: readonly number[][], key: number, col: number): number {
  const n = table.length
  if (key <= table[0][0] || key >= table[n - 1][0]) return 0
  const i = bracket(table, key)
  const a = table[i]
  const b = table[i + 1]
  const t = (key - a[0]) / (b[0] - a[0])
  const value = segment(
    table[Math.max(i - 1, 0)][col], a[col], b[col], table[Math.min(i + 2, n - 1)][col], t,
  )
  return value > 0 ? value : 0
}
