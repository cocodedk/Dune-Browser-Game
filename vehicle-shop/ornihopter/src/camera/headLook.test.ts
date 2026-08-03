// vehicle-shop/ornihopter/src/camera/headLook.test.ts
// The pilot's head must turn the way the interface says it does.
//
// It did not. cameraRig documents "yaw is positive to starboard", but a camera
// looks down -Z, and rotating (0, 0, -1) by a positive angle about +Y gives
// (-sin, 0, -cos) — toward -X, which is PORT. So the documented sign was
// backwards and dragging the mouse right turned the head left.
//
// Found by a builder that could not reach the copilot's seat without a
// strongly negative yaw, and confirmed by arithmetic rather than by argument.
// Nothing had asserted the direction, which is why a comment and the code
// could disagree for as long as they liked.

import { describe, it, expect } from 'vitest'
import { Object3D, Vector3 } from 'three'
import { createCameraRig } from './cameraRig'

/** Where the pilot is looking, in the craft's own frame. */
function gazeInCraftFrame(yawDeg: number): Vector3 {
  const craftRoot = new Object3D()
  // The rig detaches the camera to craftRoot.parent for external views, so the
  // root needs a parent to be a complete stand-in for the real scene graph.
  new Object3D().add(craftRoot)

  const rig = createCameraRig(craftRoot)
  rig.setMode('pilot')
  rig.lookAround(yawDeg, 0)

  craftRoot.updateMatrixWorld(true)
  // A DIRECTION, not a point. localToWorld(0,0,-1) returns the point one metre
  // ahead of the eye, which still carries the eye's own offset from the craft
  // origin — PILOT_EYE is 0.85m off the centreline and 8m forward, so that
  // point is nowhere near a unit vector. Subtracting the eye position is what
  // turns it back into a heading.
  const ahead = rig.camera.localToWorld(new Vector3(0, 0, -1))
  const eye = rig.camera.localToWorld(new Vector3(0, 0, 0))
  return ahead.sub(eye).normalize()
}

describe('pilot head-look', () => {
  it('looks forward, down the craft nose, when centred', () => {
    const gaze = gazeInCraftFrame(0)
    expect(gaze.z).toBeLessThan(-0.9)
    expect(Math.abs(gaze.x)).toBeLessThan(0.05)
  })

  it('positive yaw turns to STARBOARD (+X), as the interface claims', () => {
    // This is the assertion that failed before the sign fix.
    expect(gazeInCraftFrame(60).x).toBeGreaterThan(0.5)
  })

  it('negative yaw turns to port (-X)', () => {
    expect(gazeInCraftFrame(-60).x).toBeLessThan(-0.5)
  })

  it('reaches the copilot seat, which sits to starboard of the pilot', () => {
    // spec.ts puts the pilot at x = -seatOffsetX and the copilot mirrored at
    // +seatOffsetX, so the second crew seat is to the pilot's RIGHT. The whole
    // point of head-look is that this is reachable.
    const gaze = gazeInCraftFrame(85)
    expect(gaze.x).toBeGreaterThan(0.9)
  })

  it('clamps to a human neck rather than spinning the head round', () => {
    const gaze = gazeInCraftFrame(400)
    // 400 degrees clamps to 100, which is just past square to starboard.
    expect(gaze.x).toBeGreaterThan(0.9)
    expect(gaze.z).toBeGreaterThan(-0.2)
  })
})
