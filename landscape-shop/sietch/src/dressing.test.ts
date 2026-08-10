// landscape-shop/sietch/src/dressing.test.ts
// R3 guards — the dressing as it stands IN THE SCENE. Everything here is
// measured off the built meshes, never read back out of the table that
// placed them; the bake's own internal consistency is guarded separately
// in dressingBake.test.ts.
//
// The load-bearing one is the first. A prop that floats is the single
// most obvious way a dressed set breaks, and it breaks silently: a piece
// whose support moves 20 cm still renders, still passes every bbox guard,
// and just quietly hangs in the air. So the check is not "is min-y near
// the number the bake wrote" alone — a ray is fired straight down from
// each piece and has to find the hall's own rock right underneath it.

import { describe, it, expect } from 'vitest'
import { Box3, Raycaster, Vector3 } from 'three'
import type { Mesh, MeshStandardMaterial, Object3D } from 'three'
import { createSietch } from './model/Sietch'
import { DRESSING_BAKE } from './model/dressing/Dressing'
import {
  dressingOf, dressingZonesOf, hallMeshesOf, meshesOf, worldVerticesOf,
} from './testHelpers'
import { DRESSING as SPEC_DRESSING, GALLERIES } from './spec'
import { GALLERY_LAYOUT } from './model/backWall'

// A piece may sit at most this far off the surface it names. 5 cm is
// under a pixel at the rig's 30-55 px per metre, and it is small enough
// that a piece placed on the WRONG surface (floor instead of tier, tread
// instead of landing) can never pass by accident.
const CONTACT_TOLERANCE_M = 0.05
const PROBE_DROP_M = 0.5
// R3+R4's share of the 40,000-triangle set budget. The hall's own carving
// spends ~32,845 of it (surface.test.ts holds the total), which caps this
// at 7,155 — 7,100 keeps a 55-triangle margin rather than sitting exactly
// on the line the other guard also enforces. The figures' own guards
// (hearth clearance, built height) live in dressingFigures.test.ts.
const DRESSING_TRIANGLE_BUDGET = 7100

function dressingMeshes(root: Object3D): Mesh[] {
  return meshesOf(dressingOf(root))
}

describe('R3: nothing floats — every prop stands on the hall\'s own rock', () => {
  it('sits within 5 cm of the surface a downward ray finds beneath it', () => {
    const set = createSietch()
    const root = set.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const hall = hallMeshesOf(root)
    const props = dressingMeshes(root)
    expect(props.length).toBeGreaterThan(15)

    for (const mesh of props) {
      const box = new Box3().setFromObject(mesh)
      const support = mesh.userData.supportY as number
      expect(support, `${mesh.name} carries no supportY`).toBeTypeOf('number')

      // A piece that rests inside another piece (coals in a fire bowl)
      // is checked for containment instead: its own base is not on rock,
      // and the thing it IS on is dressing, not hall.
      const parentName = mesh.userData.insideOf as string | null
      if (parentName) {
        const parent = root.getObjectByName(parentName)
        expect(parent, `${mesh.name} names a parent that is not in the set`).toBeTruthy()
        const hull = new Box3().setFromObject(parent as Object3D).expandByScalar(CONTACT_TOLERANCE_M)
        expect(hull.containsBox(box), `${mesh.name} is not inside ${parentName}`).toBe(true)
        continue
      }

      expect(
        Math.abs(box.min.y - support),
        `${mesh.name} base at y=${box.min.y.toFixed(3)}, claims support ${support}`,
      ).toBeLessThanOrEqual(CONTACT_TOLERANCE_M)

      const centre = box.getCenter(new Vector3())
      const origin = new Vector3(centre.x, box.min.y + PROBE_DROP_M, centre.z)
      const raycaster = new Raycaster(origin, new Vector3(0, -1, 0), 0, PROBE_DROP_M + CONTACT_TOLERANCE_M)
      const hits = raycaster.intersectObjects(hall, false)
      expect(hits.length, `${mesh.name} has no hall geometry under it`).toBeGreaterThan(0)
      expect(
        Math.abs(hits[0].point.y - box.min.y),
        `${mesh.name} floats ${(hits[0].point.y - box.min.y).toFixed(3)} m off ${hits[0].object.name}`,
      ).toBeLessThanOrEqual(CONTACT_TOLERANCE_M)
    }
    set.dispose()
  })
})

describe('R3: the dressing clusters, and the clusters are the spec\'s own', () => {
  it('keeps every vertex of every piece inside its zone\'s authored radius', () => {
    const set = createSietch()
    const root = set.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const zones = dressingZonesOf(root)
    expect(zones.size, 'the dressing tree lost a zone').toBe(DRESSING_BAKE.zones.length)

    for (const zone of DRESSING_BAKE.zones) {
      const centre = new Vector3(...(zone.centreM as [number, number, number]))
      const meshes = zones.get(zone.name)
      expect(meshes?.length, `zone ${zone.name} is empty`).toBeGreaterThan(0)
      for (const mesh of meshes ?? []) {
        for (const [x, y, z] of worldVerticesOf(mesh)) {
          const d = centre.distanceTo(new Vector3(x, y, z))
          expect(d, `${mesh.name} reaches ${d.toFixed(2)} m from ${zone.name}'s centre`)
            .toBeLessThanOrEqual(zone.radiusM)
        }
      }
    }
    set.dispose()
  })

  // The two zones the spec names are anchored TO the spec, not beside it:
  // move DRESSING.hearthAtM and the hearth circle has to move with it.
  it('anchors the hearth and basin clusters on DRESSING\'s own coordinates', () => {
    const zoneAt = (name: string) => DRESSING_BAKE.zones.find((z) => z.name === name)
    const hearth = zoneAt('hearthCircle')
    const basin = zoneAt('basinPalmary')
    expect(hearth?.centreM[0]).toBe(SPEC_DRESSING.hearthAtM[0])
    expect(hearth?.centreM[2]).toBe(SPEC_DRESSING.hearthAtM[2])
    expect(Math.abs((basin?.centreM[0] ?? 0) - SPEC_DRESSING.basinAtM[0])).toBeLessThanOrEqual(1)
    expect(Math.abs((basin?.centreM[2] ?? 0) - SPEC_DRESSING.basinAtM[2])).toBeLessThanOrEqual(1)
  })
})

describe('R3: the dressing pays for itself', () => {
  it('stays inside its share of the triangle budget', () => {
    const set = createSietch()
    const root = set.root as unknown as Object3D
    let triangles = 0
    for (const mesh of dressingMeshes(root)) {
      const geometry = mesh.geometry
      triangles += geometry.index
        ? geometry.index.count / 3
        : geometry.attributes.position.count / 3
    }
    expect(triangles, `${triangles} dressing triangles`).toBeLessThanOrEqual(DRESSING_TRIANGLE_BUDGET)
    set.dispose()
  })

  // "Adds", not "uses": the basin kerb is cut from the hall's own worn
  // stone on purpose, so the count that matters is how many materials
  // exist in the dressing that the hall does not already have.
  it('adds exactly three materials, none of them mapped, all of them freed', () => {
    const set = createSietch()
    const root = set.root as unknown as Object3D
    const hall = new Set(hallMeshesOf(root).map((m) => m.material as MeshStandardMaterial))
    const materials = new Set(
      dressingMeshes(root)
        .map((m) => m.material as MeshStandardMaterial)
        .filter((m) => !hall.has(m)),
    )
    expect(materials.size, 'the dressing material family grew past three').toBe(3)
    for (const material of materials) {
      expect(material.map, 'a dressing material grew a texture').toBeFalsy()
      expect(material.normalMap).toBeFalsy()
      expect(material.roughnessMap).toBeFalsy()
    }
    const freed = new Set<MeshStandardMaterial>()
    for (const material of materials) material.addEventListener('dispose', () => freed.add(material))
    set.dispose()
    expect(freed.size, 'a dressing material leaked past dispose()').toBe(3)
  })
})

// The carved surround stands PROUD of the wall around galleryRightHigh's
// opening. If it ever creeps across that opening it stops being a
// surround and becomes a lid — and it would break seam.test.ts's
// socket-depth ray from the other side, as a mystery. This catches it
// here, with a vertex position.
describe('R3: the carved surround frames the raised gallery, it does not cover it', () => {
  it('puts no geometry inside the socket\'s clear opening', () => {
    const set = createSietch()
    const root = set.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const surround = root.getObjectByName('gallerySurround') as Mesh | undefined
    expect(surround, 'gallerySurround is missing').toBeTruthy()

    const gallery = GALLERY_LAYOUT.find((g) => g.name === 'galleryRightHigh')
    expect(gallery).toBeTruthy()
    const halfWidth = GALLERIES.widthM / 2
    for (const [x, y] of worldVerticesOf(surround as Mesh)) {
      const inOpening = Math.abs(x - (gallery?.x ?? 0)) < halfWidth
        && y > (gallery?.baseY ?? 0) && y < (gallery?.baseY ?? 0) + GALLERIES.heightM
      expect(inOpening, `surround vertex at (${x.toFixed(2)}, ${y.toFixed(2)}) blocks the socket`).toBe(false)
    }
    set.dispose()
  })
})
