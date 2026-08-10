// landscape-shop/cliff/tools/bake/dressKit.mjs
// The reshaping machinery R3's dressing bake runs on, kept apart from the
// placement table (tools/bake/dressPlan.mjs, tools/bake/dressSand.mjs) the way
// deform.mjs is kept apart from instances.mjs.
//
// The one operation the massif bake never needed is DECIMATION. Its feedstock
// is 260-triangle boulders read at 600 m; the dressing's is 700 to 1200
// triangle kit pieces read at 2 to 4 m, where a whole piece is worth twenty or
// thirty pixels. clusterSoup() averages the vertices that fall in each cell of
// a grid and drops the triangles that collapse: a 1232-triangle debris pile
// comes out near 130, and chunkier, which is the faceted language the rest of
// the set is already in. Deterministic — the cell key is a rounded coordinate,
// nothing is hashed against time and nothing is random.

import { deformInstance } from './deform.mjs'
import { readGlbPrimitive, normalizeSource } from './glb.mjs'

/** Vertex-cluster decimation on the RAW source, before normalizeSource, so
 *  `cell` is in the feedstock's own units and the height/radius the deformer
 *  fits against are measured on the decimated shape. */
export function clusterSoup(soup, cell) {
  if (!(cell > 0)) return soup
  const src = soup.positions
  const slot = new Map()
  const sums = []
  const counts = []
  const remap = new Uint32Array(src.length / 3)
  for (let v = 0; v < src.length / 3; v++) {
    const key = [0, 1, 2].map((a) => Math.round(src[v * 3 + a] / cell)).join(',')
    let at = slot.get(key)
    if (at === undefined) {
      at = counts.length
      slot.set(key, at)
      sums.push(0, 0, 0)
      counts.push(0)
    }
    for (let a = 0; a < 3; a++) sums[at * 3 + a] += src[v * 3 + a]
    counts[at]++
    remap[v] = at
  }
  const positions = new Float32Array(counts.length * 3)
  for (let i = 0; i < counts.length; i++) {
    for (let a = 0; a < 3; a++) positions[i * 3 + a] = sums[i * 3 + a] / counts[i]
  }
  return { ...soup, positions, index: collapse(soup.index, remap) }
}

/** Triangles whose corners fell into one cell are gone; the ones that survive
 *  are de-duplicated, because a collapsed shell folds pairs of facets onto the
 *  same three vertices and a doubled facet is z-fighting waiting to happen. */
function collapse(index, remap) {
  const kept = []
  const seen = new Set()
  for (let t = 0; t < index.length; t += 3) {
    const tri = [remap[index[t]], remap[index[t + 1]], remap[index[t + 2]]]
    if (tri[0] === tri[1] || tri[1] === tri[2] || tri[0] === tri[2]) continue
    const key = tri.slice().sort((a, b) => a - b).join(',')
    if (seen.has(key)) continue
    seen.add(key)
    kept.push(tri[0], tri[1], tri[2])
  }
  return Uint32Array.from(kept)
}

/** Reads a feedstock file once per (path, cell) pair and caches the result —
 *  sixteen pieces come out of seven files. */
export function sourceLoader(resolve) {
  const cache = new Map()
  return (relative, cell) => {
    const key = `${relative}@${cell ?? 0}`
    let soup = cache.get(key)
    if (!soup) {
      soup = normalizeSource(clusterSoup(readGlbPrimitive(resolve(relative)), cell ?? 0))
      cache.set(key, soup)
    }
    return soup
  }
}

/** sizeM is the size the piece must END UP: the deformer's taper eats into the
 *  source box, so the shape is deformed once at unit scale, measured, and only
 *  then fitted — the same two-pass fit tools/bake/compose.mjs uses. */
function fitScale(soup, spec) {
  const probe = deformInstance(soup, { ...spec, scale: [1, 1, 1], rotY: 0, pos: [0, 0, 0], dip: 0 })
  const { min, max } = boundsOf(probe.positions)
  return spec.sizeM.map((wanted, axis) => wanted / Math.max(max[axis] - min[axis], 1e-6))
}

/** One finished piece in world space, plus everything the guards and the model
 *  need to know about it without re-measuring the triangle list. */
export function shapePiece(soup, spec) {
  const { positions, index } = deformInstance(soup, { ...spec, scale: fitScale(soup, spec) })
  const { min, max } = boundsOf(positions)
  return {
    name: spec.name,
    family: spec.family,
    source: spec.src,
    anchor: spec.anchor ?? null,
    story: spec.story,
    positions,
    index,
    min: min.map(round2),
    max: max.map(round2),
    centroid: centroidOf(positions).map(round2),
    triangles: index.length / 3,
  }
}

/** Concatenates one family's pieces into a single triangle soup and records
 *  each piece's slice, so model/dressing.ts can build one mesh per family
 *  while the guards can still measure a named piece. */
export function mergeFamily(pieces) {
  const positions = []
  const index = []
  const ranges = []
  let base = 0
  for (const piece of pieces) {
    // ELEMENT offsets, not triangle offsets: that is what pack.mjs's weld
    // takes, and it hands them back re-measured in triangles after the welding
    // pass has dropped whatever it dropped.
    const from = index.length
    for (const value of piece.positions) positions.push(value)
    for (const i of piece.index) index.push(i + base)
    base += piece.positions.length / 3
    ranges.push({ name: piece.name, from, to: index.length })
  }
  return { positions, index, ranges }
}

export function boundsOf(positions) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], positions[i + a])
      max[a] = Math.max(max[a], positions[i + a])
    }
  }
  return { min, max }
}

function centroidOf(positions) {
  const sum = [0, 0, 0]
  for (let i = 0; i < positions.length; i += 3) {
    for (let a = 0; a < 3; a++) sum[a] += positions[i + a]
  }
  const count = Math.max(1, positions.length / 3)
  return sum.map((value) => value / count)
}

export function round2(value) {
  return Math.round(value * 100) / 100
}
