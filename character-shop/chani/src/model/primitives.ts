// character-shop/chani/src/model/primitives.ts
// The two mass builders that are not lofted rings: a tapering tube for limbs
// and hair locks, and a scaled sphere for small rounded masses. The third —
// loft() — has its own file because R1 pass 3's finding was DEPTH, and
// elliptical rings with independent front/back half-depths needed more code
// than one primitives file can carry under the 200-line rule.
//
// pass 2's lathe() is gone: every mass it built (torso, skull) is now a
// loft, because a revolved profile cannot express a body's front/back
// asymmetry and that asymmetry IS the profile view.

import {
  Mesh, SphereGeometry, BufferGeometry, Float32BufferAttribute,
  type MeshStandardMaterial,
} from 'three'

export interface Point3 {
  x: number
  y: number
  z: number
}

/** A tapering tube lofted along a path. The ring frame is (in-plane
 *  perpendicular to the XY tangent) x (0,0,1), so a path that drifts only
 *  gently in Z carries no twist — true of every limb and hair lock here.
 *  A path segment that moves MOSTLY in Z would shear its rings into the
 *  tangent, which is why feet are lofted rings (legs.ts) and not the tail
 *  of this tube: pass 2 did that and got ski fins.
 *
 *  `radii[i]` is the radius at `path[i]` — genuinely different radii per
 *  point is the bicep -> elbow -> forearm -> wrist life a stack of capsules
 *  could not give. `depth[i]` scales that radius in Z alone, so a thigh can
 *  be deeper than it is wide. An embedded first point (pulled back inside
 *  the parent mass) is what welds the joint instead of leaving a gap; the
 *  tube has no end caps, so BOTH ends must be either buried in another mass
 *  or tapered to a point. */
export function tube(
  path: readonly Point3[], radii: readonly number[],
  material: MeshStandardMaterial, radialSegments = 12,
  depth?: readonly number[],
): Mesh {
  const n = path.length
  const positions: number[] = []
  const indices: number[] = []
  let lastUx = 1
  let lastUy = 0

  for (let i = 0; i < n; i++) {
    const prev = path[Math.max(i - 1, 0)]
    const next = path[Math.min(i + 1, n - 1)]
    const tx = next.x - prev.x
    const ty = next.y - prev.y
    const tLen = Math.hypot(tx, ty)
    const ux = tLen > 1e-9 ? ty / tLen : lastUx
    const uy = tLen > 1e-9 ? -tx / tLen : lastUy
    lastUx = ux
    lastUy = uy
    const r = radii[i]
    const dz = depth ? depth[i] : 1
    for (let j = 0; j < radialSegments; j++) {
      const angle = (j / radialSegments) * Math.PI * 2
      const c = Math.cos(angle)
      const s = Math.sin(angle)
      positions.push(
        path[i].x + ux * c * r, path[i].y + uy * c * r, path[i].z + s * r * dz,
      )
    }
  }

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const jn = (j + 1) % radialSegments
      const a = i * radialSegments + j
      const b = i * radialSegments + jn
      const c = (i + 1) * radialSegments + j
      const d = (i + 1) * radialSegments + jn
      // (base, forward, +theta) — the same hand as loft.ts, which puts the
      // face normal outward. Pass 2 pushed (a,b,c,b,d,c), the mirror of
      // this, so EVERY limb and hair mesh in the pass-2 renders was wound
      // inside-out: with FrontSide culling the renderer was drawing the far
      // interior wall of each tube, lit by normals pointing at the tube's
      // own axis. The silhouette hid it; the shading is why the limbs read
      // as flat panels. depth.test.ts now measures the sign.
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return new Mesh(geometry, material)
}

/** A non-uniformly scaled sphere for rounded masses too small, too round or
 *  too asymmetric to loft: the deltoid caps, hands, nose, ears. */
export function blob(
  radius: number, scale: Point3, material: MeshStandardMaterial, segments = 16,
): Mesh {
  const geometry = new SphereGeometry(radius, segments, Math.max(Math.round(segments / 2), 8))
  const mesh = new Mesh(geometry, material)
  mesh.scale.set(scale.x, scale.y, scale.z)
  return mesh
}
