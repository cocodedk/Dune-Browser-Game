// landscape-shop/cliff/tools/bake/needles.mjs
// TRIANGLE QUALITY, one pass over the welded formation: it removes the
// edge-on slivers a hard cap shave leaves behind.
//
// WHERE THEY COME FROM, measured rather than guessed. deform.mjs's taper
// envelope pulls every vertex standing further out than `limit` back onto
// that limit surface (instances.mjs, capR). Where a course of the feedstock
// steps proud of the column, the shave lands the step's upper and lower
// rings on the SAME radius — the quad between them survives as a 2-8 m tall
// band spanning 50 m of wall. Flat-shaded, that band takes one normal of its
// own and renders as a hard bright or dark knife-line across the rock:
// westBastion (capR 0.58, the most aggressively shaved mass in the
// formation) carried 95 of them, worst aspect ratio 284:1.
//
// The fix is to FINISH the weld the shave started: collapse the short edge of
// a sliver so the two rings become one. Splitting the long edges instead was
// considered and rejected on the geometry — midpoint subdivision is a
// similarity transform, so it makes two slivers of the same aspect ratio out
// of one and the line is still there.

/** Collapse to the short edge's MIDPOINT, so neither ring moves more than
 *  half the short edge — under 4.3 m on a 206 m mass. */
function midpointOf(pos, a, b) {
  return [0, 1, 2].map((k) => (pos[a * 3 + k] + pos[b * 3 + k]) / 2)
}

function normalOf(pos, a, b, c) {
  const ax = pos[b * 3] - pos[a * 3]
  const ay = pos[b * 3 + 1] - pos[a * 3 + 1]
  const az = pos[b * 3 + 2] - pos[a * 3 + 2]
  const bx = pos[c * 3] - pos[a * 3]
  const by = pos[c * 3 + 1] - pos[a * 3 + 1]
  const bz = pos[c * 3 + 2] - pos[a * 3 + 2]
  const n = [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx]
  const length = Math.hypot(n[0], n[1], n[2])
  return length < 1e-9 ? null : n.map((value) => value / length)
}

/** Which vertices belong to the scoped masses ONLY. A vertex the weld shared
 *  with a mass outside the scope is left alone: moving it would reshape a
 *  mass this pass was never authorized to touch. */
function ownership(index, triangles, inScope) {
  const owner = new Int32Array(triangles.verts).fill(-1)
  for (let t = 0; t < index.length / 3; t++) {
    const mine = inScope(t) ? 1 : 0
    for (let k = 0; k < 3; k++) {
      const v = index[t * 3 + k]
      if (owner[v] === -1) owner[v] = mine
      else if (owner[v] !== mine) owner[v] = -2
    }
  }
  return owner
}

function edgeLength(pos, a, b) {
  return Math.hypot(pos[a * 3] - pos[b * 3], pos[a * 3 + 1] - pos[b * 3 + 1], pos[a * 3 + 2] - pos[b * 3 + 2])
}

/** Every sliver's short edge, shortest first — a stable sort on an
 *  insertion-ordered list, so the bake stays byte-deterministic. */
function candidates(pos, index, from, to, owner, aspect, maxShort) {
  const found = []
  for (let t = from; t < to; t++) {
    const v = [index[t * 3], index[t * 3 + 1], index[t * 3 + 2]]
    const edges = [[v[0], v[1]], [v[1], v[2]], [v[2], v[0]]]
      .map(([a, b]) => ({ a, b, length: edgeLength(pos, a, b) }))
      .sort((x, y) => x.length - y.length)
    if (edges[2].length / Math.max(edges[0].length, 1e-6) <= aspect) continue
    if (edges[0].length > maxShort) continue
    if (owner[edges[0].a] !== 1 || owner[edges[0].b] !== 1) continue
    found.push(edges[0])
  }
  return found.sort((x, y) => x.length - y.length)
}

function fanOf(index) {
  const fan = new Map()
  for (let t = 0; t < index.length / 3; t++) {
    for (let k = 0; k < 3; k++) {
      const v = index[t * 3 + k]
      if (!fan.has(v)) fan.set(v, [])
      fan.get(v).push(t)
    }
  }
  return fan
}

/** Would this collapse SLEW a surviving facet? A flat-shaded facet whose
 *  normal swings is a new plate of the wrong colour — exactly the artifact
 *  being removed — so a collapse that turns any neighbour past maxTurnDeg is
 *  refused and the vertices put back. */
function accepts(pos, index, fan, a, b, maxTurn) {
  const affected = new Set([...(fan.get(a) ?? []), ...(fan.get(b) ?? [])])
  const before = new Map()
  for (const t of affected) {
    before.set(t, normalOf(pos, index[t * 3], index[t * 3 + 1], index[t * 3 + 2]))
  }
  const mid = midpointOf(pos, a, b)
  const saved = [...pos.slice(a * 3, a * 3 + 3), ...pos.slice(b * 3, b * 3 + 3)]
  for (let k = 0; k < 3; k++) {
    pos[a * 3 + k] = mid[k]
    pos[b * 3 + k] = mid[k]
  }
  for (const t of affected) {
    const v = [0, 1, 2].map((k) => (index[t * 3 + k] === b ? a : index[t * 3 + k]))
    if (v[0] === v[1] || v[1] === v[2] || v[0] === v[2]) continue
    const after = normalOf(pos, v[0], v[1], v[2])
    const was = before.get(t)
    if (!after || !was || after[0] * was[0] + after[1] * was[1] + after[2] * was[2] < maxTurn) {
      for (let k = 0; k < 3; k++) {
        pos[a * 3 + k] = saved[k]
        pos[b * 3 + k] = saved[3 + k]
      }
      return false
    }
  }
  return true
}

function rebuild(pos, index, ranges, remap) {
  const kept = []
  const tags = []
  for (let m = 0; m < ranges.length; m++) {
    for (let t = ranges[m].from; t < ranges[m].to; t++) {
      const v = [0, 1, 2].map((k) => remap.get(index[t * 3 + k]) ?? index[t * 3 + k])
      if (v[0] === v[1] || v[1] === v[2] || v[0] === v[2]) continue
      kept.push(v[0], v[1], v[2])
      tags.push(m)
    }
  }
  const seen = new Map()
  const positions = []
  const out = []
  const outRanges = ranges.map((range) => ({ name: range.name, from: 0, to: 0 }))
  for (let m = 0; m < ranges.length; m++) {
    outRanges[m].from = out.length / 3
    for (let t = 0; t < tags.length; t++) {
      if (tags[t] !== m) continue
      for (let k = 0; k < 3; k++) {
        const v = kept[t * 3 + k]
        let at = seen.get(v)
        if (at === undefined) {
          at = positions.length / 3
          seen.set(v, at)
          positions.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2])
        }
        out.push(at)
      }
    }
    outRanges[m].to = out.length / 3
  }
  return { positions, index: out, ranges: outRanges }
}

/**
 * @param ranges  [{ name, from, to }] in TRIANGLE offsets (weld's output).
 * @param masses  names this pass may touch — nothing else is even measured.
 * One collapse per vertex per pass, so no chain can drag a vertex further
 * than half a short edge; run to convergence, which takes four passes here.
 */
export function collapseNeedles(positions, index, ranges, { masses, aspect, maxShort, maxTurnDeg }) {
  let pos = Array.from(positions)
  let idx = Array.from(index)
  let live = ranges
  let total = 0
  const maxTurn = Math.cos((maxTurnDeg * Math.PI) / 180)
  for (let pass = 0; pass < 8; pass++) {
    const scope = live.filter((range) => masses.includes(range.name))
    const inScope = (t) => scope.some((range) => t >= range.from && t < range.to)
    const owner = ownership(idx, { verts: pos.length / 3 }, inScope)
    const fan = fanOf(idx)
    const remap = new Map()
    const touched = new Set()
    let done = 0
    for (const range of scope) {
      for (const edge of candidates(pos, idx, range.from, range.to, owner, aspect, maxShort)) {
        if (touched.has(edge.a) || touched.has(edge.b)) continue
        if (!accepts(pos, idx, fan, edge.a, edge.b, maxTurn)) continue
        touched.add(edge.a)
        touched.add(edge.b)
        remap.set(edge.b, edge.a)
        done++
      }
    }
    if (!done) break
    const next = rebuild(pos, idx, live, remap)
    pos = next.positions
    idx = next.index
    live = next.ranges
    total += done
  }
  return { positions: pos, index: idx, ranges: live, collapsed: total }
}
