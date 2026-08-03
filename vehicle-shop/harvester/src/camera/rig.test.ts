// vehicle-shop/harvester/src/camera/rig.test.ts
// Regression test for the free-viewpoint placement bug: azimuth 0 must sit
// ahead of the nose (-Z, machine unrotated) looking back at the machine, not
// behind the tail. Every front-flavored named view in tools/views.mjs (front,
// frontlow, boom, hero, ...) inherits this placement, so a flipped sign here
// silently re-photographs the wrong end of the machine. Pure: a stub
// targetRef stands in for the machine's Object3D, no DOM or WebGL needed —
// PerspectiveCamera constructs fine in node.

import { describe, it, expect } from 'vitest'
import { Quaternion, Vector3 } from 'three'
import { createCameraRig } from './rig'
import type { CrawlerState } from '../contracts'

const IDLE_STATE: Readonly<CrawlerState> = {
  position: { x: 0, y: 0, z: 0 },
  yaw: 0,
  pitch: 0,
  roll: 0,
  speed: 0,
  trackLeft: 0,
  trackRight: 0,
}

/** Stand-in for the machine's Object3D: parked at the origin, unrotated. */
const stubTargetRef = {
  getWorldPosition(v: Vector3): Vector3 {
    return v.set(0, 0, 0)
  },
  getWorldQuaternion(q: Quaternion): Quaternion {
    return q.identity()
  },
}

describe('free-viewpoint placement', () => {
  it('azimuth 0 sits ahead of the nose (-Z), not behind the tail', () => {
    const rig = createCameraRig(stubTargetRef)
    rig.setViewpoint(0, 0, 1)
    rig.update(IDLE_STATE, 0)
    expect(rig.camera.position.z).toBeLessThan(0)
    expect(Math.abs(rig.camera.position.x)).toBeLessThan(1e-6)
  })

  it('azimuth 180 sits behind the tail (+Z)', () => {
    const rig = createCameraRig(stubTargetRef)
    rig.setViewpoint(180, 0, 1)
    rig.update(IDLE_STATE, 0)
    expect(rig.camera.position.z).toBeGreaterThan(0)
  })

  it('azimuth -90 stays the lit port flank (x < 0), unaffected by the fix', () => {
    const rig = createCameraRig(stubTargetRef)
    rig.setViewpoint(-90, 0, 1)
    rig.update(IDLE_STATE, 0)
    expect(rig.camera.position.x).toBeLessThan(0)
    expect(Math.abs(rig.camera.position.z)).toBeLessThan(1e-6)
  })

  it('azimuth 90 stays the starboard flank (x > 0), unaffected by the fix', () => {
    const rig = createCameraRig(stubTargetRef)
    rig.setViewpoint(90, 0, 1)
    rig.update(IDLE_STATE, 0)
    expect(rig.camera.position.x).toBeGreaterThan(0)
  })
})
