// landscape-shop/cliff/tools/bake/refine.mjs
// FACET SIZE. The feedstock is low-poly enough that single facets of the
// front wall cover thousands of pixels at the landing rig — measured on the
// R3.1 shot, the top-right corner (200 x 90 px) was 27 facets, one of them
// 2,770 px on its own. model/paintRock.ts samples the geology once per facet
// (flat shading wants one flat colour), so a plate that size is one flat
// value however much variation the geology has underneath it: the critic's
// "blown plate".
//
// Splitting the plate is what lets the paint speak. model/weathering.ts's
// flute rhythm has a ~24 m wavelength along the wall and its bands step on
// the 9.5 m course, so sub-facets 15-30 m apart sample genuinely different
// values — where the same plate painted per VERTEX only smears them.
//
// CONFORMING BY CONSTRUCTION, no T-junctions and no propagation pass: what is
// marked is an EDGE, and an edge belongs to both triangles that share it, so
// both split it. A triangle is then rebuilt from how many of its own edges
// are marked — three (1->4), two (1->3), one (1->2) or none. Every new vertex
// is created once per edge and SHARED by index, so nothing can crack.
//
// ZONED ON DEPTH, because the budget is 25,000 triangles for the whole set.
// The approach rig stands 900 m out, where even a 40 m facet is 50 px and the
// formation already reads; the landing rig stands in the forecourt. Only the
// front wall (z below frontZ) is worth the fine threshold. Measured, the
// zoning buys the same result for two thirds of the cost: front-only at 30 m
// is +2,614 triangles for 51 corner facets, where the same 30 m applied to
// the whole formation costs +5,288 for the same 51.
//
// ONE PASS, and the limits are therefore a strong tendency and not an
// invariant. Marking reads the edges of the INPUT mesh; the two- and
// one-marked cases then join a split point to the far corner, and that new
// interior edge is a median of the parent triangle, which can be longer than
// the limit. Measured over the finished bake: front-wall facets carrying an
// edge over 30 m fall from 17% to 10% of the zone, facets over 45 m anywhere
// from 1,087 to 468, and the longest edge in the formation from 185 m to
// 93 m. A second pass would close the gap and costs about 2,900 more
// triangles, which the 25,000 budget does not have.

const EDGE_KEY = 1e7

function key(a, b) {
  return a < b ? a * EDGE_KEY + b : b * EDGE_KEY + a
}

function edgeLength(pos, a, b) {
  return Math.hypot(pos[a * 3] - pos[b * 3], pos[a * 3 + 1] - pos[b * 3 + 1], pos[a * 3 + 2] - pos[b * 3 + 2])
}

/** Which limit this edge answers to: the fine one on the front wall, the
 *  coarse one behind it. Decided on the edge's own midpoint so both triangles
 *  sharing it always agree — that is what keeps the zone boundary conforming
 *  too. */
function limitFor(pos, a, b, { frontZ, frontEdge, backEdge }) {
  const z = (pos[a * 3 + 2] + pos[b * 3 + 2]) / 2
  return z < frontZ ? frontEdge : backEdge
}

function markEdges(pos, index, options) {
  const marked = new Set()
  for (let t = 0; t < index.length / 3; t++) {
    const v = [index[t * 3], index[t * 3 + 1], index[t * 3 + 2]]
    for (const [a, b] of [[v[0], v[1]], [v[1], v[2]], [v[2], v[0]]]) {
      if (edgeLength(pos, a, b) > limitFor(pos, a, b, options)) marked.add(key(a, b))
    }
  }
  return marked
}

/** One split vertex per marked edge, created on first use. Both endpoints are
 *  already on the weld's decimetre grid, so the midpoint is exact — it lands
 *  ON the parent edge rather than near it. */
function splitter(pos, marked) {
  const made = new Map()
  return (a, b) => {
    const edge = key(a, b)
    if (!marked.has(edge)) return -1
    let vertex = made.get(edge)
    if (vertex === undefined) {
      vertex = pos.length / 3
      pos.push(
        (pos[a * 3] + pos[b * 3]) / 2,
        (pos[a * 3 + 1] + pos[b * 3 + 1]) / 2,
        (pos[a * 3 + 2] + pos[b * 3 + 2]) / 2,
      )
      made.set(edge, vertex)
    }
    return vertex
  }
}

/** The four cases. The two-marked case cuts from the split of one marked edge
 *  to the split of the other and then to the far corner, which is the pair of
 *  diagonals that leaves no triangle thinner than the parent was. */
function split(a, b, c, mAB, mBC, mCA) {
  const marks = (mAB >= 0) + (mBC >= 0) + (mCA >= 0)
  if (marks === 0) return [a, b, c]
  if (marks === 3) return [a, mAB, mCA, mAB, b, mBC, mCA, mBC, c, mAB, mBC, mCA]
  if (marks === 1) {
    if (mAB >= 0) return [a, mAB, c, mAB, b, c]
    if (mBC >= 0) return [b, mBC, a, mBC, c, a]
    return [c, mCA, b, mCA, a, b]
  }
  if (mAB < 0) return [b, mBC, mCA, b, mCA, a, mBC, c, mCA]
  if (mBC < 0) return [c, mCA, mAB, c, mAB, b, mCA, a, mAB]
  return [a, mAB, mBC, a, mBC, c, mAB, b, mBC]
}

/**
 * @param ranges  [{ name, from, to }] in TRIANGLE offsets (weld's output).
 * @param options { frontZ, frontEdge, backEdge } — the depth the fine zone
 *                starts at, and the longest edge allowed on each side of it.
 * @returns the same shape, with each mass's triangles still contiguous so
 *          model/strata.ts can keep addressing them by range.
 */
export function refineFacets(positions, index, ranges, options) {
  const pos = Array.from(positions)
  const marked = markEdges(pos, index, options)
  const midOf = splitter(pos, marked)

  const out = []
  const outRanges = []
  for (const range of ranges) {
    const from = out.length / 3
    for (let t = range.from; t < range.to; t++) {
      const [a, b, c] = [index[t * 3], index[t * 3 + 1], index[t * 3 + 2]]
      out.push(...split(a, b, c, midOf(a, b), midOf(b, c), midOf(c, a)))
    }
    outRanges.push({ name: range.name, from, to: out.length / 3 })
  }
  return { positions: pos, index: out, ranges: outRanges, split: marked.size }
}
