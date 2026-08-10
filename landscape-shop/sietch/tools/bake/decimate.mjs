// landscape-shop/sietch/tools/bake/decimate.mjs
// Split out of reshape.mjs at the 200-line rule. One function, and the
// one that decides how much of the vendor's density actually ships.
//
// The rig is 20-35 m from this dressing, which is 30-55 pixels per metre.
// A 0.10 m cell is 3-5 pixels: detail below it cannot be seen, and the
// triangles spent on it come straight out of the hall's own carving
// budget. Per-piece cell sizes live in tools/bake/pieces.mjs.

/**
 * Grid-cluster collapse at `cellM` world metres. Every vertex inside a
 * cell becomes that cell's mean position (the mean, not the cell centre —
 * a centre snaps a smooth lathe into a staircase); triangles that lose two
 * corners to the same cell, and duplicate triangles, are dropped. Purely a
 * function of the input, so the bake stays byte-identical run to run.
 */
export function decimate(world, index, cellM) {
  const cells = new Map()
  const remap = new Map()
  for (const vi of new Set(index)) {
    const key = [0, 1, 2].map((c) => Math.floor(world[vi * 3 + c] / cellM)).join(',')
    let cell = cells.get(key)
    if (!cell) { cell = { i: cells.size, sum: [0, 0, 0], n: 0 }; cells.set(key, cell) }
    for (let c = 0; c < 3; c++) cell.sum[c] += world[vi * 3 + c]
    cell.n++
    remap.set(vi, cell)
  }
  const vertices = new Array(cells.size)
  for (const cell of cells.values()) vertices[cell.i] = cell.sum.map((v) => v / cell.n)

  const triangles = []
  const seen = new Set()
  for (let t = 0; t < index.length; t += 3) {
    const tri = [remap.get(index[t]).i, remap.get(index[t + 1]).i, remap.get(index[t + 2]).i]
    if (tri[0] === tri[1] || tri[1] === tri[2] || tri[0] === tri[2]) continue
    const key = [...tri].sort((a, b) => a - b).join(',')
    if (seen.has(key)) continue
    seen.add(key)
    triangles.push({ tri, source: index[t] })
  }
  return { vertices, triangles }
}
