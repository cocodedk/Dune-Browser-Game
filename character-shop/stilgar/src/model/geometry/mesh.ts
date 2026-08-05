// character-shop/stilgar/src/model/geometry/mesh.ts
// Turns a parametric surface function into a BufferGeometry. One closed,
// smooth-shaded mesh per organic FORM (skull-through-jaw, hood, beard,
// wrap) instead of a pile of primitives that merely overlap.
//
// Winding convention, derived once here so no caller has to re-derive it:
// with `u` sweeping the way the head's own rings do (u=0 dead front at -Z,
// then the figure's +X side, then the back) and `v` running upward, the
// quad (a=u,v) (b=u+,v) (c=u,v+) (d=u+,v+) is outward-facing as the two
// triangles (a,c,b) and (b,c,d). Everything in this file and in shell.ts
// is built on that identity.

import { BufferGeometry, BufferAttribute } from 'three'

export type Pt = [number, number, number]
/** u wraps 0..1 around the axis, v runs 0..1 bottom to top. */
export type Surface = (u: number, v: number) => Pt

export function finishGeo(positions: number[], indices: number[]): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export interface RevolveOptions {
  uSegs: number
  vSegs: number
  /** The v=1 ring collapses to a point (a crown): emit ONE shared apex
   *  vertex so its normal averages every face around it and the crown
   *  shades as a dome, not a fan of facets. */
  apexTop?: boolean
  /** Flat fan across the v=0 ring — used where the bottom is buried inside
   *  another mass and only needs to not be a hole. */
  capBottom?: boolean
  capTop?: boolean
}

/** A closed-around surface of revolution with an arbitrary radial profile.
 *  The head, the neck-into-jaw flow and the ribcage are all one call each. */
export function revolveGeo(surface: Surface, o: RevolveOptions): BufferGeometry {
  const { uSegs, vSegs } = o
  const rings = o.apexTop ? vSegs : vSegs + 1
  const positions: number[] = []
  const indices: number[] = []
  const push = (p: Pt): number => {
    positions.push(p[0], p[1], p[2])
    return positions.length / 3 - 1
  }

  const ring: number[][] = []
  for (let j = 0; j < rings; j++) {
    const v = j / vSegs
    const row: number[] = []
    for (let i = 0; i < uSegs; i++) row.push(push(surface(i / uSegs, v)))
    ring.push(row)
  }

  for (let j = 0; j < rings - 1; j++) {
    for (let i = 0; i < uSegs; i++) {
      const i2 = (i + 1) % uSegs
      const a = ring[j][i]
      const b = ring[j][i2]
      const c = ring[j + 1][i]
      const d = ring[j + 1][i2]
      indices.push(a, c, b, b, c, d)
    }
  }

  const top = ring[rings - 1]
  if (o.apexTop) {
    const apex = push(surface(0, 1))
    for (let i = 0; i < uSegs; i++) indices.push(top[i], apex, top[(i + 1) % uSegs])
  } else if (o.capTop) {
    const hub = push(centroid(positions, top))
    for (let i = 0; i < uSegs; i++) indices.push(top[i], hub, top[(i + 1) % uSegs])
  }
  if (o.capBottom) {
    const base = ring[0]
    const hub = push(centroid(positions, base))
    for (let i = 0; i < uSegs; i++) indices.push(hub, base[i], base[(i + 1) % uSegs])
  }

  return finishGeo(positions, indices)
}

function centroid(positions: number[], row: readonly number[]): Pt {
  let x = 0
  let y = 0
  let z = 0
  for (const index of row) {
    x += positions[index * 3]
    y += positions[index * 3 + 1]
    z += positions[index * 3 + 2]
  }
  return [x / row.length, y / row.length, z / row.length]
}
