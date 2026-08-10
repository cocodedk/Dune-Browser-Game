// scripts/new-shop-templates-land-model.mjs
// LANDSCAPE model seed + seam.test.ts for `npm run land:new`. Split from
// ./new-shop-templates-land.mjs (docs + contracts + spec + main) so both
// files stay under the 200-line cap. The model builds a rock-toned box
// massing plus a skirt (seats below y = 0) and an entrance marker (the
// -Z front face), sized so the assembled set already matches spec.ts's
// FOOTPRINT exactly — the seam test's guards are real from the first
// commit, not deferred to when real geometry lands. Static: no update
// method (landscape-shop/docs/gauntlet-loop.md: no animation contract).

export function renderLandModel(name, Name) {
  return `// landscape-shop/${name}/src/model/${Name}.ts
// Placeholder builder: a rock-toned box massing at the footprint, a skirt
// seating below y = 0, and an entrance marker flush with the -Z front
// face, sized to FOOTPRINT so the scaffold builds, matches spec, and the
// seam test is green immediately. Replace each box with real geometry in
// place — keep the 'massing', 'skirt' and 'entrance' names; the seam test
// keys off them. Static: no update() — see contracts.ts.

import { Group, Mesh, BoxGeometry, MeshStandardMaterial } from 'three'
import type { LandscapeModel } from '../contracts'
import { FOOTPRINT, PALETTE } from '../spec'

function block(width: number, height: number, depth: number): Mesh {
  const geometry = new BoxGeometry(width, height, depth)
  const material = new MeshStandardMaterial({ color: PALETTE.rock })
  return new Mesh(geometry, material)
}

export function create${Name}(): LandscapeModel {
  const { widthM, depthM, heightM, skirtDepthM } = FOOTPRINT

  const root = new Group()
  root.name = '${name}'
  const meshes: Mesh[] = []

  // Massing: the main rock body, base at y = 0, top at y = heightM, spans
  // the full footprint from z = 0 (back) to z = -depthM (front).
  const massing = block(widthM, heightM, depthM)
  massing.name = 'massing'
  massing.position.set(0, heightM / 2, -depthM / 2)
  root.add(massing)
  meshes.push(massing)

  // Skirt: seats below y = 0 for procedural terrain, never floating.
  const skirt = block(widthM, skirtDepthM, depthM)
  skirt.name = 'skirt'
  skirt.position.set(0, -skirtDepthM / 2, -depthM / 2)
  root.add(skirt)
  meshes.push(skirt)

  // Entrance marker: thin block flush with the front (-Z) face, inside
  // the massing's own bounds — documents and measures the "front toward
  // -Z" convention (landscape-shop/docs/gauntlet-loop.md) without
  // growing the overall footprint past what spec.ts declares.
  const entranceWidth = widthM * 0.3
  const entranceHeight = heightM * 0.5
  const entranceDepth = Math.min(0.1, depthM)
  const entrance = block(entranceWidth, entranceHeight, entranceDepth)
  entrance.name = 'entrance'
  entrance.position.set(0, entranceHeight / 2, -depthM + entranceDepth / 2)
  root.add(entrance)
  meshes.push(entrance)

  return {
    root,
    dispose(): void {
      for (const mesh of meshes) {
        mesh.geometry.dispose()
        ;(mesh.material as MeshStandardMaterial).dispose()
      }
      root.clear()
    },
  }
}
`
}

export function renderLandSeamTest(name, Name) {
  return `// landscape-shop/${name}/src/seam.test.ts
// The seam between the massing and the scene — lead-owned; see
// landscape-shop/docs/gauntlet-loop.md: "seam.test.ts guards from day
// one: footprint within 1% of spec.ts, front-toward-Z, base-at-zero, and
// dispose() completeness." Measured off the real geometry — never
// asserted from spec.ts alone.

import { describe, it, expect } from 'vitest'
import { Box3, Vector3 } from 'three'
import type { Object3D, Mesh, MeshStandardMaterial } from 'three'
import { create${Name} } from './model/${Name}'
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
    const set = create${Name}()
    const root = set.root as unknown as Object3D
    const size = boundsOf(root).getSize(new Vector3())
    expect(withinOnePercent(size.x, FOOTPRINT.widthM)).toBe(true)
    expect(withinOnePercent(size.z, FOOTPRINT.depthM)).toBe(true)
    set.dispose()
  })

  it('overall height (massing + skirt) is within 1% of spec', () => {
    const set = create${Name}()
    const root = set.root as unknown as Object3D
    const size = boundsOf(root).getSize(new Vector3())
    const expectedHeight = FOOTPRINT.heightM + FOOTPRINT.skirtDepthM
    expect(withinOnePercent(size.y, expectedHeight)).toBe(true)
    set.dispose()
  })

  it('the entrance sits at the front-most (most negative) Z: the -Z convention', () => {
    const set = create${Name}()
    const root = set.root as unknown as Object3D
    const rootMinZ = boundsOf(root).min.z
    const entranceMinZ = boundsOf(entranceOf(root)).min.z
    expect(entranceMinZ).toBeLessThan(0)
    expect(entranceMinZ).toBeCloseTo(rootMinZ, 4)
    set.dispose()
  })

  it('the base never floats: min-y stays within [-skirtDepthM, 0]', () => {
    const set = create${Name}()
    const root = set.root as unknown as Object3D
    const minY = boundsOf(root).min.y
    expect(minY).toBeGreaterThanOrEqual(-FOOTPRINT.skirtDepthM - 1e-6)
    expect(minY).toBeLessThanOrEqual(1e-6)
    set.dispose()
  })

  it('dispose does not throw', () => {
    const set = create${Name}()
    expect(() => set.dispose()).not.toThrow()
  })

  it('dispose frees every geometry and material it created', () => {
    const set = create${Name}()
    const root = set.root as unknown as Object3D
    const meshes = meshesOf(root)
    expect(meshes.length).toBeGreaterThan(0)

    const disposed = new Set<string>()
    for (const mesh of meshes) {
      mesh.geometry.addEventListener('dispose', () => disposed.add(\`geometry:\${mesh.uuid}\`))
      const material = mesh.material as MeshStandardMaterial
      material.addEventListener('dispose', () => disposed.add(\`material:\${mesh.uuid}\`))
    }

    set.dispose()

    for (const mesh of meshes) {
      expect(disposed.has(\`geometry:\${mesh.uuid}\`)).toBe(true)
      expect(disposed.has(\`material:\${mesh.uuid}\`)).toBe(true)
    }
  })
})
`
}
