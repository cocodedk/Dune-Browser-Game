// landscape-shop/sietch/src/seam.test.ts
// The seam between the massing and the scene — lead-owned; see
// landscape-shop/docs/gauntlet-loop.md: "seam.test.ts guards from day
// one: footprint within 1% of spec.ts, front-toward-Z, base-at-zero, and
// dispose() completeness." Measured off the real geometry — never
// asserted from spec.ts alone.

import { describe, it, expect } from 'vitest'
import { Box3, Vector3, PerspectiveCamera, Raycaster } from 'three'
import type { Object3D, MeshStandardMaterial } from 'three'
import { createSietch } from './model/Sietch'
import { GALLERY_LAYOUT, CAP_Z } from './model/backWall'
import { FOOTPRINT, CAMERA_RIG } from './spec'
import { withinOnePercent, boundsOf, entranceOf, meshesOf, someMeshBoxMatches } from './testHelpers'

describe('seam: the set matches its footprint and faces its own -Z', () => {
  it('width and depth are within 1% of FOOTPRINT', () => {
    const set = createSietch()
    const root = set.root as unknown as Object3D
    const size = boundsOf(root).getSize(new Vector3())
    expect(withinOnePercent(size.x, FOOTPRINT.widthM)).toBe(true)
    expect(withinOnePercent(size.z, FOOTPRINT.depthM)).toBe(true)
    set.dispose()
  })

  it('overall height (massing + skirt) is within 1% of spec', () => {
    const set = createSietch()
    const root = set.root as unknown as Object3D
    const size = boundsOf(root).getSize(new Vector3())
    const expectedHeight = FOOTPRINT.heightM + FOOTPRINT.skirtDepthM
    expect(withinOnePercent(size.y, expectedHeight)).toBe(true)
    set.dispose()
  })

  it('the entrance sits at the front-most (most negative) Z: the -Z convention', () => {
    const set = createSietch()
    const root = set.root as unknown as Object3D
    const rootMinZ = boundsOf(root).min.z
    const entranceMinZ = boundsOf(entranceOf(root)).min.z
    expect(entranceMinZ).toBeLessThan(0)
    expect(entranceMinZ).toBeCloseTo(rootMinZ, 4)
    set.dispose()
  })

  it('the base never floats: min-y stays within [-skirtDepthM, 0]', () => {
    const set = createSietch()
    const root = set.root as unknown as Object3D
    const minY = boundsOf(root).min.y
    expect(minY).toBeGreaterThanOrEqual(-FOOTPRINT.skirtDepthM - 1e-6)
    expect(minY).toBeLessThanOrEqual(1e-6)
    set.dispose()
  })

  it('dispose does not throw', () => {
    const set = createSietch()
    expect(() => set.dispose()).not.toThrow()
  })

  it('dispose frees every geometry and material it created', () => {
    const set = createSietch()
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

// R1 — massing and silhouette guards (landscape-shop/docs/gauntlet-loop.md):
// "no set edge, no sky, no gap may be visible from CAMERA_RIG... keep ~3 m
// of composition margin on every frame edge". Measured, not assumed: a ray
// from the rig position through every frame corner, at every camera x the
// release adapter's drift can put the camera at, and at both a narrow and
// an ultrawide viewport, must land on set geometry.
const DRIFT_CAMERA_X_M = [0, -3, 3]
const ASPECTS = [1.6, 2.4]
const NDC_CORNERS: Array<[number, number]> = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
const MAX_ENCLOSURE_DISTANCE_M = FOOTPRINT.depthM + FOOTPRINT.widthM

describe('seam: the enclosure is unbroken from CAMERA_RIG, at the adapter\'s drift and any viewport aspect', () => {
  it('every frame-corner ray hits set geometry', () => {
    const set = createSietch()
    const root = set.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const meshes = meshesOf(root)
    const [, rigY, rigZ] = CAMERA_RIG.positionM
    const lookAt = new Vector3(...(CAMERA_RIG.lookAtM as [number, number, number]))

    for (const x of DRIFT_CAMERA_X_M) {
      for (const aspect of ASPECTS) {
        const camera = new PerspectiveCamera(CAMERA_RIG.fovDeg, aspect, 0.1, 200)
        camera.position.set(x, rigY, rigZ)
        camera.lookAt(lookAt)
        camera.updateMatrixWorld(true)
        camera.updateProjectionMatrix()

        for (const [ndcX, ndcY] of NDC_CORNERS) {
          const target = new Vector3(ndcX, ndcY, 0.5).unproject(camera)
          const direction = target.sub(camera.position).normalize()
          const raycaster = new Raycaster(camera.position.clone(), direction, 0, MAX_ENCLOSURE_DISTANCE_M)
          const hits = raycaster.intersectObjects(meshes, false)
          expect(
            hits.length,
            `no hit for camera x=${x}, aspect=${aspect}, corner=(${ndcX},${ndcY})`,
          ).toBeGreaterThan(0)
        }
      }
    }
    set.dispose()
  })
})

// "floor at y=0 ... no gap" plus the floor's own habitation cues (ledges,
// hearth lip, basin) sit off the x = 0 centreline by design (floor.ts) —
// this guard walks that clear line and requires it to stay flat.
const FLOOR_SAMPLE_Z_M = [-38, -30, -22, -14, -6]
const FLOOR_FLATNESS_TOLERANCE_M = 0.02

describe('seam: the floor stays at y=0 across the walkable centre', () => {
  it('a downward ray at x=0 lands within tolerance of y=0 at every sample depth', () => {
    const set = createSietch()
    const root = set.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const meshes = meshesOf(root)

    for (const z of FLOOR_SAMPLE_Z_M) {
      const origin = new Vector3(0, 5, z)
      const raycaster = new Raycaster(origin, new Vector3(0, -1, 0), 0, 10)
      const hits = raycaster.intersectObjects(meshes, false)
      expect(hits.length, `no floor hit at x=0, z=${z}`).toBeGreaterThan(0)
      expect(Math.abs(hits[0].point.y)).toBeLessThanOrEqual(FLOOR_FLATNESS_TOLERANCE_M)
    }
    set.dispose()
  })
})

// R1.2: two fresh critics failed R1 on the same gap — "the wall openings
// have no real depth... decals on a wall, not cuts into rock". A ray
// toward each gallery's centre must pass clean through the (now genuinely
// absent) cap material and land on the socket's OWN geometry at least 2m
// past the cap plane — proof of a real punched hole, not a flat rectangle.
const GALLERY_MIN_SOCKET_DEPTH_M = 2

describe('seam: gallery openings are real punched sockets, not decals on the wall', () => {
  it('a ray from CAMERA_RIG toward each gallery centre first hits geometry >= 2m behind the cap plane', () => {
    const set = createSietch()
    const root = set.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const meshes = meshesOf(root)
    const origin = new Vector3(...(CAMERA_RIG.positionM as [number, number, number]))

    for (const gallery of GALLERY_LAYOUT) {
      const targetY = gallery.baseY + gallery.height / 2
      const target = new Vector3(gallery.x, targetY, CAP_Z)
      const direction = target.clone().sub(origin).normalize()
      const raycaster = new Raycaster(origin, direction, 0, 200)
      const hits = raycaster.intersectObjects(meshes, false)
      expect(hits.length, `no hit toward ${gallery.name}`).toBeGreaterThan(0)
      const msg = `${gallery.name} hit too shallow at z=${hits[0].point.z} (cap z=${CAP_Z})`
      expect(hits[0].point.z, msg).toBeGreaterThanOrEqual(CAP_Z + GALLERY_MIN_SOCKET_DEPTH_M)
    }
    set.dispose()
  })
})

// R1.3: a walkable ledge in its own y-band on the right wall. R1.4 rooted
// check: buildTierTermination's NAMED pier must span floor-to-band —
// pinned by name, not satisfiable by the envelope shell's own AABB.
const TIER_Y_BAND = { min: 5, max: 6 }
const RIGHT_WALL_MIN_X_M = 10
const ROOTED_MAX_FLOOR_GAP_M = 0.5

describe('seam: the gallery tier is a real, rooted walkable ledge on the right wall', () => {
  it('sits in its y-band, and its far end is rooted floor-to-band via a named pier', () => {
    const set = createSietch()
    const root = set.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const inBand = someMeshBoxMatches(root, (box) =>
      box.max.x > RIGHT_WALL_MIN_X_M && box.max.y >= TIER_Y_BAND.min && box.min.y <= TIER_Y_BAND.max)
    expect(inBand, 'no geometry found in the 5-6m y-band on the right wall (x > 10)').toBe(true)
    const pier = root.getObjectByName('galleryTierTerminationPier')
    expect(pier, 'galleryTierTerminationPier is missing — the far end has no rooting mass').toBeTruthy()
    const box = new Box3().setFromObject(pier as Object3D)
    const rooted = box.min.y <= ROOTED_MAX_FLOOR_GAP_M && box.max.y >= TIER_Y_BAND.min && box.max.x > RIGHT_WALL_MIN_X_M
    expect(rooted, 'pier does not root the far end floor-to-band on the right wall').toBe(true)
    set.dispose()
  })
})
