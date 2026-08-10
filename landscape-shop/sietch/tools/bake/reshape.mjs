// landscape-shop/sietch/tools/bake/reshape.mjs
// The transform half of the bake: what turns a licensed kit piece into a
// piece of THIS hall. Nothing here is a conversion — every function
// removes, re-proportions or coarsens geometry, and a piece goes through
// all of them before it is written.
//
//   dropVendorPlate  every Desert Kingdom asset stands on a 40-triangle
//                    pale sand disc, so it can be dropped on an empty
//                    showroom floor. In a rock hall it reads as a bright
//                    pad under every object. It goes, always.
//   cropSource       keeps only the part of an asset this set wants — the
//                    stone drum of a well without its roof, the frame of a
//                    doorway without its door.
//   placePiece       true-metre scaling (non-uniform where the set needs a
//                    different proportion), Y rotation, and a base-corner
//                    placement so a piece SITS on its named support.
//   decimate         grid-cluster collapse at a world-space cell size. The
//                    rig is 20-35 m from this dressing, which is 30-55 px
//                    per metre: a 0.12 m cell is 4-6 px. Vendor density
//                    beyond that is invisible and is triangle budget the
//                    hall's own carving needs.

import { boundsOf } from './glb.mjs'

// The exact linear COLOR_0 of the vendor's ground plate, and the height
// band it occupies. Both are measured off the feedstock, not guessed.
const PLATE_RGB = [0.388, 0.275, 0.110]
const PLATE_TOLERANCE = 0.02
const PLATE_TOP_Y = 0.05

const isPlateColour = (colors, vi) =>
  PLATE_RGB.every((c, i) => Math.abs(colors[vi * 3 + i] - c) < PLATE_TOLERANCE)

/** Triangles that survive a per-triangle predicate, as a fresh index. */
function filterTriangles(index, keep) {
  const out = []
  for (let t = 0; t < index.length; t += 3) {
    if (keep(index[t], index[t + 1], index[t + 2])) out.push(index[t], index[t + 1], index[t + 2])
  }
  return new Uint32Array(out)
}

export function dropVendorPlate(soup) {
  const { positions, colors, index } = soup
  return filterTriangles(index, (a, b, c) => {
    const flat = [a, b, c].every((vi) => positions[vi * 3 + 1] <= PLATE_TOP_Y)
    return !(flat && isPlateColour(colors, a))
  })
}

/** Keeps triangles whose CENTROID is inside `box` (source units, any bound
 *  omitted means unbounded), or outside it when `invert` is set — the
 *  latter is how a doorway's own leaf is cut out to leave a bare surround.
 *
 *  Centroid, not every-vertex: an all-vertices test silently deletes every
 *  triangle that straddles the cut, which on a facade means the big flat
 *  panels go and only the small detail survives — measured, the first cut
 *  of gallerySurround came back as a 155-triangle sheet 0.16 m deep. A
 *  centroid cut leaves a ragged edge instead of a hole, and ragged is what
 *  hand-cut rock looks like. */
export function cropSource(soup, index, box) {
  if (!box) return index
  const { positions } = soup
  const inside = (a, b, c) => {
    const at = (axis) => (positions[a * 3 + axis] + positions[b * 3 + axis] + positions[c * 3 + axis]) / 3
    const x = at(0), y = at(1), z = at(2)
    return (box.minX == null || x >= box.minX) && (box.maxX == null || x <= box.maxX)
      && (box.minY == null || y >= box.minY) && (box.maxY == null || y <= box.maxY)
      && (box.minZ == null || z >= box.minZ) && (box.maxZ == null || z <= box.maxZ)
  }
  // `strict` switches to a per-VERTEX test: keep only if every corner is
  // in, or (inverted) drop if any corner is in. That is what cuts a clean
  // rectangular opening — a centroid cut leaves triangles hanging into the
  // hole, and the hole here is a gallery socket whose darkness the whole
  // set depends on (seam.test.ts measures a ray straight through it).
  const strictIn = (a, b, c) => inside(a, a, a) && inside(b, b, b) && inside(c, c, c)
  const strictTouches = (a, b, c) => inside(a, a, a) || inside(b, b, b) || inside(c, c, c)
  if (box.invert) {
    return filterTriangles(index, box.strict
      ? (a, b, c) => !strictTouches(a, b, c)
      : (a, b, c) => !inside(a, b, c))
  }
  return filterTriangles(index, box.strict ? strictIn : inside)
}

/** Splits off the emissive part of an asset. The kit encodes flame and
 *  lamp-glow as COLOR_0 values ABOVE 1.0 — an out-of-range vertex colour
 *  is exactly, and only, the bit that is meant to be giving off light. */
export function selectEmissive(soup, index, want) {
  const { colors } = soup
  const hdr = (vi) => colors[vi * 3] > 1 || colors[vi * 3 + 1] > 1 || colors[vi * 3 + 2] > 1
  return filterTriangles(index, (a) => hdr(a) === want)
}

/** Shaves a source to flat planes instead of dropping triangles at them:
 *  every vertex past a limit is pulled ONTO it. A crop cannot narrow a
 *  facade whose panels are one big triangle each — their centroids sit in
 *  the middle, so the whole panel either survives at full width or
 *  vanishes. Shaving cuts the panel instead, which is also what quarrying
 *  a doorcase out of a bigger block actually does. */
function shaveSource(positions, shave) {
  if (!shave) return positions
  const out = Float32Array.from(positions)
  for (let i = 0; i < out.length; i += 3) {
    if (shave.absX != null) out[i] = Math.max(-shave.absX, Math.min(shave.absX, out[i]))
    if (shave.maxY != null) out[i + 1] = Math.min(shave.maxY, out[i + 1])
    if (shave.minZ != null) out[i + 2] = Math.max(shave.minZ, out[i + 2])
    if (shave.openX != null) openUp(out, i, shave)
  }
  return out
}

/** Cuts the OPENING out of a facade by pushing every vertex inside it to
 *  the nearest edge of the hole. Triangles wholly inside collapse to a
 *  line and are dropped by the decimator; triangles straddling the edge
 *  are pinched onto it, so the frame stays solid and the hole is clean.
 *
 *  This replaced a crop, and the crop was the bug. A doorway facade is
 *  built from a few very large panels; dropping every triangle that
 *  reaches into the opening deleted the frame itself and left 177
 *  triangles of stray decoration (seen by isolating the mesh in the clay
 *  pass — debug.ts's isolate(), which is what the tool is for). Deforming
 *  is what carving a hole in a slab actually does. */
function openUp(out, i, shave) {
  const x = out[i]
  const y = out[i + 1]
  const openY = shave.openY ?? Infinity
  if (Math.abs(x) >= shave.openX || y >= openY) return
  if (shave.openX - Math.abs(x) <= openY - y) out[i] = (x < 0 ? -1 : 1) * shave.openX
  else out[i + 1] = openY
}

/**
 * True-metre placement. `heightM` sets the scale and IS the finished
 * height; `spreadXZ` and `squashZ` re-proportion the footprint (a rolled
 * carpet becomes a floor mat by keeping 0.14 m of height and spreading
 * ten-fold sideways); `rotYDeg` turns the piece; `atM` is where its BASE
 * lands: x and z centre its footprint, y is the support surface it stands
 * on. Returns world-space positions for the vertices `index` reaches.
 */
export function placePiece(soup, index, piece) {
  const positions = shaveSource(soup.positions, piece.shave)
  const src = boundsOf(positions, index)
  const srcHeight = Math.max(1e-4, src.max[1] - src.min[1])
  const s = piece.heightM / srcHeight
  const sx = s * (piece.spreadXZ ?? 1)
  const sz = sx * (piece.squashZ ?? 1)
  const sy = s
  const angle = ((piece.rotYDeg ?? 0) * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  const out = new Float32Array(positions.length)
  const touched = new Set(index)
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
  for (const vi of touched) {
    const x = (positions[vi * 3] - (src.min[0] + src.max[0]) / 2) * sx
    const y = (positions[vi * 3 + 1] - src.min[1]) * sy
    const z = (positions[vi * 3 + 2] - (src.min[2] + src.max[2]) / 2) * sz
    const rx = x * cos + z * sin
    const rz = -x * sin + z * cos
    const p = [rx, y, rz]
    for (let c = 0; c < 3; c++) {
      out[vi * 3 + c] = p[c]
      if (p[c] < bounds.min[c]) bounds.min[c] = p[c]
      if (p[c] > bounds.max[c]) bounds.max[c] = p[c]
    }
  }
  // Re-centre on the ROTATED footprint, then stand it on atM's y.
  const shift = [
    piece.atM[0] - (bounds.min[0] + bounds.max[0]) / 2,
    piece.atM[1] - bounds.min[1],
    piece.atM[2] - (bounds.min[2] + bounds.max[2]) / 2,
  ]
  for (const vi of touched) for (let c = 0; c < 3; c++) out[vi * 3 + c] += shift[c]
  return out
}
