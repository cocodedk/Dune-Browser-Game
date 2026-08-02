// vehicle-shop/ornihopter/src/interior/frustum.test.ts
// Measures the built cockpit against the ACTUAL pilot camera frustum, using
// three's own Frustum (the same culling math the renderer uses), rather than
// trusting layout.ts's numbers by re-stating them. This is the mechanical
// half of bar Q3 ("second seat visible to the side") and it fails honestly:
// see Cockpit.ts's file header for the measured reason and the mitigation.
//
// Camera setup matches camera/cameraRig.ts's pilot mode exactly — fov 68,
// zero rotation, parented at PILOT_EYE — at the 1600x1000 size
// tools/shoot.mjs captures the pilot-POV frame at.

import { describe, it, expect, afterAll } from 'vitest'
import { PerspectiveCamera, Frustum, Matrix4, Box3, type Object3D } from 'three'
import { createCockpit } from './Cockpit'
import { EYE } from './layout'

function pilotFrustum(): Frustum {
  const camera = new PerspectiveCamera(68, 1600 / 1000, 0.25, 6000)
  camera.position.set(EYE.x, EYE.y, EYE.z)
  camera.quaternion.set(0, 0, 0, 1)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
  const viewProjection = new Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  )
  return new Frustum().setFromProjectionMatrix(viewProjection)
}

function boxFor(root: Object3D, name: string): Box3 {
  const obj = root.getObjectByName(name)
  if (!obj) throw new Error(`interior part not found: ${name}`)
  return new Box3().setFromObject(obj)
}

describe('pilot-cam visibility, measured against the built geometry', () => {
  const cockpit = createCockpit()
  // CockpitModel.root is typed as contracts.ts's narrow Object3DLike (kept
  // three-free so the flight side of the repo can stay pure); this is
  // actually a real three.js Group, so the test reaches back to the full
  // type the same way debug.ts does for its own measurements.
  const root = cockpit.root as unknown as Object3D
  root.updateMatrixWorld(true)
  const frustum = pilotFrustum()

  afterAll(() => cockpit.dispose())

  it('KNOWN LIMITATION: neither seat is visible here', () => {
    expect(frustum.intersectsBox(boxFor(root, 'seat-pilot'))).toBe(false)
    expect(frustum.intersectsBox(boxFor(root, 'seat-copilot'))).toBe(false)
  })

  it('CHANGED in round 6b: the copilot figure reaches into frame at the knees', () => {
    // The seats still sit at the eye's own station and are still behind the
    // camera. The figure is not entirely behind it any more: with the crew
    // 0.38m off the centreline rather than 0.85m, its thighs and boots — which
    // reach 0.58m forward of the seat reference — cross into the frustum on
    // the pilot's right. That is a body beside you, which is what bar Q3 was
    // ever really asking for.
    expect(frustum.intersectsBox(boxFor(root, 'pilotFigure'))).toBe(true)
  })

  it('CHANGED in round 6b: BOTH control arms are visible', () => {
    // They used to be floor-mounted posts at each seat's own x, and the
    // copilot's could not be in this frame at any height. The arms now hang
    // from the brow beam ahead of the crew (layout.ts's STICK, and
    // .shots/reference/thopter-03.jpg, which is where they hang in the
    // reference too), so both run down through the forward view. This is a
    // better answer to bar Q3 than the old console-cluster mitigation, and it
    // is recorded as a change of contract rather than left as a stale
    // expectation that happens to still pass.
    expect(frustum.intersectsBox(boxFor(root, 'stick-pilot'))).toBe(true)
    expect(frustum.intersectsBox(boxFor(root, 'stick-copilot'))).toBe(true)
  })

  it('mitigation: the console, including the copilot-side cluster, is visible', () => {
    expect(frustum.intersectsBox(boxFor(root, 'console'))).toBe(true)
    expect(frustum.intersectsBox(boxFor(root, 'console-copilot-cluster'))).toBe(true)
  })

  it('mitigation: the pilot\'s own stick is visible', () => {
    expect(frustum.intersectsBox(boxFor(root, 'stick-pilot'))).toBe(true)
  })

  it('mitigation: the shared overhead panel is visible', () => {
    expect(frustum.intersectsBox(boxFor(root, 'overheadPanel'))).toBe(true)
  })

  it('the cabin shell pokes into frame via the forward floor and wall greebles', () => {
    // The shell as a whole spans from the nose to the rear bulkhead behind the
    // seats, so most of it — like the seats — is out of frame too; only its
    // forward-most strip (see layout.ts WALL.greebleZMin/Max) is not.
    expect(frustum.intersectsBox(boxFor(root, 'cabinShell'))).toBe(true)
  })
})
