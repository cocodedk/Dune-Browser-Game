// landscape-shop/sietch/tools/bake/pack.mjs
// How a finished piece is written down. The bake is COMMITTED, so its
// size is a real cost: model code imports it, and the released chunk has
// a 150,000-byte budget (landscape-shop/docs/gauntlet-loop.md). Four
// choices carry most of the saving:
//
//   * positions are CENTIMETRE INTEGERS relative to the piece's own min
//     corner. A palm's numbers become 0..540 instead of -11.83500..., and
//     1 cm is a third of a pixel at the rig's 30-55 px per metre.
//   * geometry stays INDEXED here and is expanded to a flat-shaded soup
//     at build time (src/model/dressing/buildPiece.ts) — the expansion is
//     what lets one colour serve a whole facet.
//   * a triangle carries a tone INDEX, not a colour.
//   * R4: all three are BINARY, base64 in the JSON (Int16 positions,
//     Uint16 index, Uint8 tone) instead of JSON number arrays. Measured
//     against this bake (23 R3 pieces, 5,254 triangles): plain-array JSON
//     was 100,663 bytes for posCm+index+tone alone; base64 binary is
//     80,161 — a real cut, just not the flat "smaller unit = smaller
//     file" saving it looks like (Int16 is 2 bytes whether it counts
//     centimetres or decimetres, so R4 kept CENTIMETRE precision rather
//     than trade the hearth lip's 5 cm contact tolerance for a byte count
//     that does not move). src/model/dressing/bakeCodec.ts decodes it back.
//
// Quantising can land two distinct vertices on the same centimetre, so
// the pack re-welds afterwards and drops anything that collapsed. What is
// written is therefore always already clean: the triangle count in the
// file is the triangle count the model builds, which is what the
// bake-drift guard compares.

const CM = 100
// Shared across every piece via the caller's `tones` array — the file
// this guards is tools/bakeDressing.mjs, which threads one array through
// every piece and figure so the table stays a single, deduplicated whole.
const MAX_TONES = 256

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

  for (const cm of posCm) {
    if (cm < -32768 || cm > 32767) throw new Error(`pack: position ${cm} cm overflows Int16`)
  }
  for (const i of index) {
    if (i > 65535) throw new Error(`pack: vertex index ${i} overflows Uint16`)
  }
  for (const t of tones) {
    if (t >= MAX_TONES) throw new Error(`pack: tone index ${t} overflows the Uint8 table (max ${MAX_TONES})`)
  }

  return {
    originM,
    boundsMin: lo.map(round2),
    boundsMax: max.map(round2),
    triangles: index.length / 3,
    vertices: posCm.length / 3,
    posQ: base64Of(Int16Array.from(posCm)),
    indexQ: base64Of(Uint16Array.from(index)),
    toneQ: base64Of(Uint8Array.from(tones)),
  }
}

function base64Of(typedArray) {
  return Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength).toString('base64')
}

function round2(v) {
  return Math.round(v * 100) / 100
}
