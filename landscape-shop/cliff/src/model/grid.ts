// landscape-shop/cliff/src/model/grid.ts
// Generic displaced-grid mesh builder shared by the front face and the
// skirt/apron — a rectangular column x row lattice of world positions,
// triangulated with an optional predicate to skip quads (the entrance
// hole). Double-sided: several authored surfaces meet at shared seams and
// a single flipped winding anywhere would otherwise punch an invisible
// hole with no easy way to spot which one from a screenshot.

import { BackSide, BufferGeometry, BufferAttribute, DoubleSide, Mesh, MeshStandardMaterial } from 'three'

export interface GridPoint {
  x: number
  y: number
  z: number
}

/** columns[c][r] — column-major, row 0 at the bottom. */
export type GridColumns = GridPoint[][]

export interface BuildGridOptions {
  /** Return true to omit the quad whose lower-left corner is (colIndex,
   *  rowIndex) — used to punch the entrance hole. */
  skipQuad?(colIndex: number, rowIndex: number): boolean
}

export function buildGridGeometry(columns: GridColumns, options: BuildGridOptions = {}): BufferGeometry {
  const cols = columns.length
  const rows = columns[0]?.length ?? 0
  const raw: number[] = []
  for (const column of columns) {
    for (const point of column) {
      raw.push(point.x, point.y, point.z)
    }
  }

  const indices: number[] = []
  const vertexIndex = (c: number, r: number): number => c * rows + r
  for (let c = 0; c < cols - 1; c++) {
    for (let r = 0; r < rows - 1; r++) {
      if (options.skipQuad?.(c, r)) continue
      const a = vertexIndex(c, r)
      const b = vertexIndex(c + 1, r)
      const cc = vertexIndex(c + 1, r + 1)
      const d = vertexIndex(c, r + 1)
      // Wound so the face normal points toward -Z (outward, toward the
      // approaching camera) for this front-facing lattice.
      indices.push(a, cc, b, a, d, cc)
    }
  }

  // Vertices left orphaned by skipQuad are DROPPED, not just unused: three.js
  // measures a bounding box off the whole position attribute, so an orphan
  // sitting inside the entrance hole would silently claim the set's frontmost
  // point and break the -Z convention guard.
  const { positions, remapped } = compact(raw, indices)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex(remapped)
  geometry.computeVertexNormals()
  return geometry
}

function compact(raw: number[], indices: number[]): { positions: number[]; remapped: number[] } {
  const seen = new Map<number, number>()
  const positions: number[] = []
  const remapped = indices.map((original) => {
    let at = seen.get(original)
    if (at === undefined) {
      at = positions.length / 3
      seen.set(original, at)
      positions.push(raw[original * 3], raw[original * 3 + 1], raw[original * 3 + 2])
    }
    return at
  })
  return { positions, remapped }
}

/** Flood-fills `keep`'s true cells (4-connected) into components and
 *  returns a predicate true only for cells in the LARGEST one. Built for
 *  buildGateWall's skipQuad: a hard rock/no-rock test can leave a tiny
 *  island of quads with no path back to the main surface — geometry that
 *  renders as a shard floating with nothing visibly holding it up.
 *  Dropping every component but the biggest removes those without
 *  touching the real surface at all. */
export function largestComponentMask(
  cols: number, rows: number, keep: (c: number, r: number) => boolean,
): (c: number, r: number) => boolean {
  const id = new Int32Array(cols * rows).fill(-1)
  const at = (c: number, r: number): number => c * rows + r
  const sizes: number[] = []
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (!keep(c, r) || id[at(c, r)] !== -1) continue
      const component = sizes.length
      const stack: Array<[number, number]> = [[c, r]]
      id[at(c, r)] = component
      let size = 0
      while (stack.length) {
        const [cc, rr] = stack.pop() as [number, number]
        size++
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nc = cc + dc
          const nr = rr + dr
          if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue
          if (!keep(nc, nr) || id[at(nc, nr)] !== -1) continue
          id[at(nc, nr)] = component
          stack.push([nc, nr])
        }
      }
      sizes.push(size)
    }
  }
  let largest = 0
  for (let i = 1; i < sizes.length; i++) if (sizes[i] > sizes[largest]) largest = i
  return (c, r) => id[at(c, r)] === largest
}

export function meshFrom(geometry: BufferGeometry, color: number): Mesh {
  // shadowSide: BackSide — same fix, same reason as model/massif.ts: a
  // DoubleSide material casts shadow from both faces by default, so a
  // grazing-lit panel self-shadows into acne (a regular tiling artifact,
  // confirmed with a shadows-off diagnostic render). Casting from the back
  // face keeps every front fragment comparing against a depth behind it.
  const material = new MeshStandardMaterial({ color, side: DoubleSide })
  material.shadowSide = BackSide
  return new Mesh(geometry, material)
}
