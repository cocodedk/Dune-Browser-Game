// landscape-shop/sietch/tools/bake/pack.mjs
// How a finished piece is written down. The bake is COMMITTED, so its
// size is a real cost: model code imports it, and the released chunk has
// a 150,000-byte budget (landscape-shop/docs/gauntlet-loop.md). Three
// choices carry most of the saving:
//
//   * positions are CENTIMETRE INTEGERS relative to the piece's own min
//     corner. A palm's numbers become 0..540 instead of -11.83500..., and
//     1 cm is a third of a pixel at the rig's 30-55 px per metre.
//   * geometry stays INDEXED here and is expanded to a flat-shaded soup
//     at build time (src/model/dressing/buildPiece.ts) — the expansion is
//     what lets one colour serve a whole facet.
//   * a triangle carries a tone INDEX, not a colour.
//
// Quantising can land two distinct vertices on the same centimetre, so
// the pack re-welds afterwards and drops anything that collapsed. What is
// written is therefore always already clean: the triangle count in the
// file is the triangle count the model builds, which is what the
// bake-drift guard compares.

const CM = 100

export function packPiece(vertices, triangles, tone) {
  const min = [Infinity, Infinity, Infinity]
  for (const v of vertices) for (let c = 0; c < 3; c++) min[c] = Math.min(min[c], v[c])
  const originM = min.map((v) => Math.floor(v * CM) / CM)

  const seen = new Map()
  const remap = new Array(vertices.length)
  const posCm = []
  vertices.forEach((v, i) => {
    const cm = [0, 1, 2].map((c) => Math.round((v[c] - originM[c]) * CM))
    const key = cm.join(',')
    let at = seen.get(key)
    if (at === undefined) {
      at = posCm.length / 3
      seen.set(key, at)
      posCm.push(...cm)
    }
    remap[i] = at
  })

  const index = []
  const tones = []
  const kept = new Set()
  triangles.forEach(({ tri }, i) => {
    const t = tri.map((v) => remap[v])
    if (t[0] === t[1] || t[1] === t[2] || t[0] === t[2]) return
    const key = [...t].sort((a, b) => a - b).join(',')
    if (kept.has(key)) return
    kept.add(key)
    index.push(...t)
    tones.push(tone[i])
  })

  const max = [-Infinity, -Infinity, -Infinity]
  const lo = [Infinity, Infinity, Infinity]
  for (const vi of index) {
    for (let c = 0; c < 3; c++) {
      const v = originM[c] + posCm[vi * 3 + c] / CM
      if (v > max[c]) max[c] = v
      if (v < lo[c]) lo[c] = v
    }
  }

  return {
    originM,
    boundsMin: lo.map(round2),
    boundsMax: max.map(round2),
    triangles: index.length / 3,
    vertices: posCm.length / 3,
    posCm,
    index,
    tone: tones,
  }
}

function round2(v) {
  return Math.round(v * 100) / 100
}
