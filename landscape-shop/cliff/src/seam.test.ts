// landscape-shop/cliff/src/seam.test.ts
// The seam between the massing and the scene — lead-owned; see
// landscape-shop/docs/gauntlet-loop.md: "seam.test.ts guards from day
// one: footprint within 1% of spec.ts, front-toward-Z, base-at-zero, and
// dispose() completeness." Measured off the real geometry — never
// asserted from spec.ts alone.

import { describe, it, expect } from 'vitest'
import { Box3, Vector3 } from 'three'
import type { Object3D, Mesh, MeshStandardMaterial } from 'three'
import { createCliff } from './model/Cliff'
import { FOOTPRINT } from './spec'

function withinOnePercent(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= expected * 0.01
}

function boundsOf(part: Object3D): Box3 {
  part.updateMatrixWorld(true)
  return new Box3().setFromObject(part)
}

function entranceOf(root: Object3D): Object3D {
  const entrance = root.getObjectByName('entrance')
  if (!entrance) throw new Error('entrance marker missing from the set')
  return entrance
}

function meshesOf(root: Object3D): Mesh[] {
  const meshes: Mesh[] = []
  root.traverse((child) => {
    const mesh = child as Mesh
    if (mesh.isMesh) meshes.push(mesh)
  })
  return meshes
}

describe('seam: the set matches its footprint and faces its own -Z', () => {
  it('width and depth are within 1% of FOOTPRINT', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const size = boundsOf(root).getSize(new Vector3())
    expect(withinOnePercent(size.x, FOOTPRINT.widthM)).toBe(true)
    expect(withinOnePercent(size.z, FOOTPRINT.depthM)).toBe(true)
    set.dispose()
  })

  it('overall height (massing + skirt) is within 1% of spec', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const size = boundsOf(root).getSize(new Vector3())
    const expectedHeight = FOOTPRINT.heightM + FOOTPRINT.skirtDepthM
    expect(withinOnePercent(size.y, expectedHeight)).toBe(true)
    set.dispose()
  })

  it('the entrance sits at the front-most (most negative) Z: the -Z convention', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const rootMinZ = boundsOf(root).min.z
    const entranceMinZ = boundsOf(entranceOf(root)).min.z
    expect(entranceMinZ).toBeLessThan(0)
    expect(entranceMinZ).toBeCloseTo(rootMinZ, 4)
    set.dispose()
  })

  it('the base never floats: min-y stays within [-skirtDepthM, 0]', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const minY = boundsOf(root).min.y
    expect(minY).toBeGreaterThanOrEqual(-FOOTPRINT.skirtDepthM - 1e-6)
    expect(minY).toBeLessThanOrEqual(1e-6)
    set.dispose()
  })

  it('dispose does not throw', () => {
    const set = createCliff()
    expect(() => set.dispose()).not.toThrow()
  })

  it('dispose frees every geometry and material it created', () => {
    const set = createCliff()
    const root = set.root as unknown as Object3D
    const meshes = meshesOf(root)
    expect(meshes.length).toBeGreaterThan(0)

    const disposed = new Set<string>()
    for (const mesh of meshes) {
      mesh.geometry.addEventListener('dispose', () => disposed.add(`geometry:${mesh.uuid}`))
      const material = mesh.material as MeshStandardMaterial
      material.addEventListener('dispose', () => disposed.add(`material:${mesh.uuid}`))
    }

    set.dispose()

    for (const mesh of meshes) {
      expect(disposed.has(`geometry:${mesh.uuid}`)).toBe(true)
      expect(disposed.has(`material:${mesh.uuid}`)).toBe(true)
    }
  })
})
