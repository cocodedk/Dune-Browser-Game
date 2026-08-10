// landscape-shop/cliff/tools/bake/rank.mjs
// Measures the formation's HIERARCHY: every mass's solid volume and world
// bounds, biggest first. Committed into massifBake.json so the claim "one
// mass dominates this formation" is a number the guards can read, not a
// note in a commit message (bakeSeam.test.ts).
//
// Volume, not a bounding box: an AABB inflates by up to 40% on a mass
// turned 45 degrees, so a box-ranked "hero" would just be whichever
// flanker happened to be rotated most. The signed-tetrahedron sum is
// rotation-invariant. Mirrored masses are safe — deform.mjs reverses their
// winding so their shells still face outward — and the sum is taken
// absolute anyway.

/**
 * @param positions merged, normalized formation positions
 * @param index     merged index buffer
 * @param ranges    [{ name, from, to }] — each mass's slice of `index`
 */
export function rank(positions, index, ranges) {
  return ranges
    .map(({ name, from, to }) => measure(positions, index, name, from, to))
    .sort((a, b) => b.volumeM3 - a.volumeM3)
}

function measure(positions, index, name, from, to) {
  let volume = 0
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let t = from; t < to; t += 3) {
    const a = index[t] * 3
    const b = index[t + 1] * 3
    const c = index[t + 2] * 3
    volume += tetraVolume(positions, a, b, c)
    for (const v of [a, b, c]) {
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], positions[v + axis])
        max[axis] = Math.max(max[axis], positions[v + axis])
      }
    }
  }
  return {
    name,
    volumeM3: Math.round(Math.abs(volume)),
    min: min.map(round2),
    max: max.map(round2),
  }
}

/** Signed volume of the tetrahedron (origin, a, b, c). */
function tetraVolume(p, a, b, c) {
  const cx = p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]
  const cy = p[b + 2] * p[c] - p[b] * p[c + 2]
  const cz = p[b] * p[c + 1] - p[b + 1] * p[c]
  return (p[a] * cx + p[a + 1] * cy + p[a + 2] * cz) / 6
}

function round2(value) {
  return Math.round(value * 100) / 100
}
