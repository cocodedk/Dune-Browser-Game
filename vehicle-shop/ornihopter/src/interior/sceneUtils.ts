// vehicle-shop/ornihopter/src/interior/sceneUtils.ts
// Small shared helpers so every part module does not repeat the same
// box-mesh boilerplate and dispose traversal.

import {
  Group, Object3D, Mesh, BoxGeometry, BufferGeometry, BufferAttribute, CylinderGeometry,
  SphereGeometry, MeshStandardMaterial,
} from 'three'

interface Disposable {
  dispose(): void
}

/** Disposes every geometry and material under root, deduped so a material
 *  shared by several greebles in the same group is not disposed twice. */
export function disposeGroup(root: Group): void {
  const seen = new Set<Disposable>()
  root.traverse((child) => {
    const mesh = child as Object3D & {
      isMesh?: boolean
      geometry?: Disposable
      material?: Disposable | Disposable[]
    }
    if (!mesh.isMesh || !mesh.geometry) return
    if (!seen.has(mesh.geometry)) {
      seen.add(mesh.geometry)
      mesh.geometry.dispose()
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of materials) {
      if (m && !seen.has(m)) {
        seen.add(m)
        m.dispose()
      }
    }
  })
}

export interface Placed {
  x: number
  y: number
  z: number
}

/** A box mesh, positioned by its centre. */
export function box(
  w: number,
  h: number,
  d: number,
  material: MeshStandardMaterial,
  at: Placed
): Mesh {
  const mesh = new Mesh(new BoxGeometry(w, h, d), material)
  mesh.position.set(at.x, at.y, at.z)
  return mesh
}

/** An upright cylinder (Y axis), positioned by its centre. */
export function cylinderY(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  material: MeshStandardMaterial,
  at: Placed,
  radialSegments = 8
): Mesh {
  const mesh = new Mesh(
    new CylinderGeometry(radiusTop, radiusBottom, height, radialSegments),
    material
  )
  mesh.position.set(at.x, at.y, at.z)
  return mesh
}

export function ball(radius: number, material: MeshStandardMaterial, at: Placed): Mesh {
  const mesh = new Mesh(new SphereGeometry(radius, 10, 8), material)
  mesh.position.set(at.x, at.y, at.z)
  return mesh
}

/**
 * A flat panel from four corners given in perimeter order (two triangles,
 * a-b-c and a-c-d) — the same technique model/geometry/canopyGeometry.ts
 * uses for its glazing panes, duplicated here rather than imported so the
 * canopy module does not have to widen its exported surface for an interior
 * concern. Used to fair opaque liner panels exactly onto the canopy shell's
 * own sill/rail line (see canopySectionAt), so "the wall meets the canopy"
 * is a shared number, not two guesses that happen to agree.
 */
export function flatQuad(
  a: Placed,
  b: Placed,
  c: Placed,
  d: Placed,
  material: MeshStandardMaterial
): Mesh {
  const points = [a, b, c, a, c, d]
  const array = new Float32Array(points.length * 3)
  points.forEach((p, i) => array.set([p.x, p.y, p.z], i * 3))
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(array, 3))
  geometry.computeVertexNormals()
  return new Mesh(geometry, material)
}
