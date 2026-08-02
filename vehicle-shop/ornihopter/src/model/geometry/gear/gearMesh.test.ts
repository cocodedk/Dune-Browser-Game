// vehicle-shop/ornihopter/src/model/geometry/gear/gearMesh.test.ts
// Winding, not positions.
//
// Every wing test in this project measured vertex POSITIONS, which were
// correct, while one wing rendered pitch black because the mirrored side's
// triangles were wound backwards (wingGeometry.ts's note; wingNormals.test.ts
// is the guard that was added afterwards). The landing gear mirrors the same
// way for the same reason, so it gets the same guard from the start — plus a
// check on the primitive itself, since pushSegment's cap order was derived on
// paper and paper is not evidence.

import { describe, it, expect } from 'vitest'
import { pushSegment, type MeshBuffers } from './plate'
import { buildLandingGearGeometry } from '../gearGeometry'
import { GEAR_LEGS } from './stance'

interface Vector { x: number; y: number; z: number }

function faceNormals(positions: readonly number[], indices: readonly number[]): {
  normal: Vector
  centroid: Vector
}[] {
  const at = (i: number): Vector => ({
    x: positions[i * 3], y: positions[i * 3 + 1], z: positions[i * 3 + 2],
  })
  const out = []
  for (let i = 0; i < indices.length; i += 3) {
    const a = at(indices[i])
    const b = at(indices[i + 1])
    const c = at(indices[i + 2])
    const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }
    const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z }
    out.push({
      normal: {
        x: u.y * v.z - u.z * v.y,
        y: u.z * v.x - u.x * v.z,
        z: u.x * v.y - u.y * v.x,
      },
      centroid: { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3, z: (a.z + b.z + c.z) / 3 },
    })
  }
  return out
}

describe('pushSegment', () => {
  it('winds all twelve triangles of a plate outward', () => {
    const buffers: MeshBuffers = { positions: [], indices: [] }
    const section = { halfBreadth: 0.4, halfThick: 0.15 }
    // Deliberately a skew sweep, not an axis-aligned one: an axis-aligned box
    // would pass even if the breadth/thickness frame were degenerate.
    pushSegment(buffers, [1, 2, -3], [2.4, 0.6, -3.9], section, section)
    expect(buffers.indices.length / 3).toBe(12)
    const middle = { x: 1.7, y: 1.3, z: -3.45 }
    for (const face of faceNormals(buffers.positions, buffers.indices)) {
      const outward =
        face.normal.x * (face.centroid.x - middle.x) +
        face.normal.y * (face.centroid.y - middle.y) +
        face.normal.z * (face.centroid.z - middle.z)
      expect(outward).toBeGreaterThan(0)
    }
  })
})

describe('landing gear mesh', () => {
  it('stays inside the round\'s triangle budget', () => {
    const geometry = buildLandingGearGeometry()
    const triangles = (geometry.getIndex()?.count ?? 0) / 3
    expect(triangles).toBe(GEAR_LEGS.length * 6 * 12)
    expect(triangles).toBeLessThanOrEqual(600)
    geometry.dispose()
  })

  it('lights both sides the same way, so neither renders black', () => {
    const geometry = buildLandingGearGeometry()
    const normal = geometry.attributes.normal
    const position = geometry.attributes.position
    const half = position.count / 2
    for (let i = 0; i < half; i++) {
      // Vertex i on the right and vertex i + half on the left are the same
      // point of the same leg, so their normals must mirror exactly. A
      // re-wind that was skipped (or applied twice) shows up here as
      // left.y === -right.y rather than +right.y.
      expect(position.getX(i + half)).toBeCloseTo(-position.getX(i), 6)
      expect(normal.getX(i + half)).toBeCloseTo(-normal.getX(i), 5)
      expect(normal.getY(i + half)).toBeCloseTo(normal.getY(i), 5)
      expect(normal.getZ(i + half)).toBeCloseTo(normal.getZ(i), 5)
    }
    geometry.dispose()
  })

  it('points the soles of the feet at the ground', () => {
    // If a pad were built upside down the stance test would still pass — it
    // only reads gear/stance.ts's numbers, never the mesh. Faces, not
    // vertices: every corner is emitted once PER FACE (plate.ts), so the
    // lowest vertices belong to the sole, the pad sides and the toe cap
    // alike, and only the sole's own two triangles lie wholly on the plane.
    const geometry = buildLandingGearGeometry()
    const positions = Array.from(geometry.attributes.position.array as Float32Array)
    const indices = Array.from(geometry.getIndex()?.array as ArrayLike<number>)
    let lowest = Infinity
    for (let i = 1; i < positions.length; i += 3) lowest = Math.min(lowest, positions[i])
    let soles = 0
    for (let i = 0; i < indices.length; i += 3) {
      const ys = [0, 1, 2].map((k) => positions[indices[i + k] * 3 + 1])
      if (Math.max(...ys) > lowest + 2e-3) continue
      soles++
      const face = faceNormals(positions, indices.slice(i, i + 3))[0]
      const length = Math.hypot(face.normal.x, face.normal.y, face.normal.z)
      expect(face.normal.y / length).toBeLessThan(-0.9)
    }
    expect(soles).toBe(GEAR_LEGS.length * 2)
    geometry.dispose()
  })
})
