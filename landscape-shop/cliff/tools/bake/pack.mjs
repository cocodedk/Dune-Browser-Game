// landscape-shop/cliff/tools/bake/pack.mjs
// Turns the merged triangle soup into what actually gets committed: a welded,
// indexed, centimetre-rounded position list plus the formation's own front
// outline (which the procedural skirt is built from, so skirt and rock never
// disagree about where the base of the massif is).
//
// Welding only merges vertices that already sit at the same point — the
// feedstock duplicates them per hard edge. The model re-splits them with
// toNonIndexed() so every facet keeps a flat normal; welding is purely a
// file-size measure.

const ROUND = 10 // decimetres — 10 cm on a 600 m formation is well under one pixel at either rig

/** @param ranges [{ name, from, to }] slices of `index`, in element offsets.
 *  Welding can drop a degenerate triangle, so the same slices are re-measured
 *  on the way out and returned in TRIANGLE offsets. That is what lets
 *  model/strata.ts know which mass each finished triangle belongs to — and so
 *  which bedding plane colours it — without storing a per-triangle id. */
export function weld(positions, index, ranges = []) {
  const lookup = new Map()
  const out = []
  const remap = new Uint32Array(positions.length / 3)
  for (let v = 0; v < positions.length / 3; v++) {
    const x = Math.round(positions[v * 3] * ROUND) / ROUND
    const y = Math.round(positions[v * 3 + 1] * ROUND) / ROUND
    const z = Math.round(positions[v * 3 + 2] * ROUND) / ROUND
    const key = `${x},${y},${z}`
    let at = lookup.get(key)
    if (at === undefined) {
      at = out.length / 3
      lookup.set(key, at)
      out.push(x, y, z)
    }
    remap[v] = at
  }

  const welded = []
  const kept = new Array(ranges.length).fill(null).map(() => ({ from: 0, to: 0 }))
  let at = 0
  for (let t = 0; t < index.length; t += 3) {
    while (at < ranges.length && t >= ranges[at].to) at++
    if (at < ranges.length && t === ranges[at].from) {
      kept[at].from = welded.length / 3
      kept[at].to = kept[at].from
    }
    const a = remap[index[t]]
    const b = remap[index[t + 1]]
    const c = remap[index[t + 2]]
    // Rounding can collapse a hair-thin triangle onto a line; dropping those
    // keeps computeVertexNormals() from producing NaN normals.
    if (a === b || b === c || a === c) continue
    welded.push(a, b, c)
    if (at < ranges.length) kept[at].to = welded.length / 3
  }
  return {
    positions: out,
    index: welded,
    ranges: ranges.map((range, i) => ({ name: range.name, from: kept[i].from, to: kept[i].to })),
  }
}

/**
 * The frontmost rock z at each of `samples` columns across the width, taken
 * from the band just above and below the ground plane. Empty columns inherit
 * the nearest occupied one, so the skirt stays continuous where the massif
 * narrows.
 */
export function frontOutline(positions, { minX, maxX, samples, bandLow, bandHigh, frontZ }) {
  const xs = []
  const zs = new Array(samples).fill(Number.NaN)
  const step = (maxX - minX) / (samples - 1)
  for (let i = 0; i < samples; i++) xs.push(minX + step * i)

  for (let v = 0; v < positions.length; v += 3) {
    const y = positions[v + 1]
    if (y < bandLow || y > bandHigh) continue
    const slot = Math.round((positions[v] - minX) / step)
    if (slot < 0 || slot >= samples) continue
    const z = positions[v + 2]
    if (Number.isNaN(zs[slot]) || z < zs[slot]) zs[slot] = z
  }

  fillGaps(zs, frontZ)
  return { xs: xs.map(round2), zs: zs.map(round2) }
}

/**
 * A coarse map of the rock's frontmost z over an (x, y) window — the surface
 * the procedural gate prow has to grow out of. Storing it in the bake is what
 * lets model/gateWall.ts guarantee its own skirt of geometry stays BURIED in
 * rock instead of hanging out of the massif like a shelf.
 */
export const NO_ROCK = 9999

export function frontField(positions, index, { minX, maxX, minY, maxY, nx, ny }) {
  const z = new Array(nx * ny).fill(NO_ROCK)
  const stepX = (maxX - minX) / (nx - 1)
  const stepY = (maxY - minY) / (ny - 1)

  // Sampled off the TRIANGLES, not the vertices: this feedstock is low-poly
  // enough that whole grid cells contain no vertex at all, and a
  // vertex-sampled field reads as a hole where a 40 m facet actually passes.
  for (let t = 0; t < index.length; t += 3) {
    const tri = [0, 1, 2].map((k) => index[t + k] * 3)
    const gx = tri.map((v) => (positions[v] - minX) / stepX)
    const gy = tri.map((v) => (positions[v + 1] - minY) / stepY)
    const c0 = Math.max(0, Math.floor(Math.min(...gx)))
    const c1 = Math.min(nx - 1, Math.ceil(Math.max(...gx)))
    const r0 = Math.max(0, Math.floor(Math.min(...gy)))
    const r1 = Math.min(ny - 1, Math.ceil(Math.max(...gy)))
    const det = (gy[1] - gy[2]) * (gx[0] - gx[2]) + (gx[2] - gx[1]) * (gy[0] - gy[2])
    if (Math.abs(det) < 1e-9) continue
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const a = ((gy[1] - gy[2]) * (c - gx[2]) + (gx[2] - gx[1]) * (r - gy[2])) / det
        const b = ((gy[2] - gy[0]) * (c - gx[2]) + (gx[0] - gx[2]) * (r - gy[2])) / det
        if (a < -0.001 || b < -0.001 || a + b > 1.001) continue
        const at = r * nx + c
        const value = a * positions[tri[0] + 2] + b * positions[tri[1] + 2] + (1 - a - b) * positions[tri[2] + 2]
        if (value < z[at]) z[at] = value
      }
    }
  }
  // Cells the rock never covers keep the NO_ROCK marker on purpose: the prow
  // must not emit geometry where there is nothing to hide it, and a filled-in
  // guess would put a shelf of wall out in open sky.
  return { minX, maxX, minY, maxY, nx, ny, noRock: NO_ROCK, z: median3(z, nx, ny).map(round2) }
}

/** A single isolated notch between two masses would otherwise pull a 100 m
 *  dent into the prow that grows out of this field. Medians remove the
 *  isolated cell and keep the real structure. */
function median3(z, nx, ny) {
  const out = z.slice()
  for (let r = 0; r < ny; r++) {
    for (let c = 0; c < nx; c++) {
      if (z[r * nx + c] === NO_ROCK) continue
      const window = []
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr
          const cc = c + dc
          if (rr < 0 || rr >= ny || cc < 0 || cc >= nx) continue
          if (z[rr * nx + cc] !== NO_ROCK) window.push(z[rr * nx + cc])
        }
      }
      window.sort((a, b) => a - b)
      out[r * nx + c] = window[(window.length - 1) >> 1]
    }
  }
  return out
}

function fillGaps(zs, fallback) {
  // Only the skirt outline is gap-filled: it is a continuous band around the
  // whole formation and a hole in it would tear the apron open.
  let last = Number.NaN
  for (let i = 0; i < zs.length; i++) {
    if (Number.isNaN(zs[i])) zs[i] = last
    else last = zs[i]
  }
  let next = Number.NaN
  for (let i = zs.length - 1; i >= 0; i--) {
    if (Number.isNaN(zs[i])) zs[i] = next
    else next = zs[i]
  }
  for (let i = 0; i < zs.length; i++) if (Number.isNaN(zs[i])) zs[i] = fallback
}

function round2(value) {
  return Math.round(value * 100) / 100
}
