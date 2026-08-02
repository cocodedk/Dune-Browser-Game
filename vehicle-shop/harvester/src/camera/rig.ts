// vehicle-shop/harvester/src/camera/rig.ts
// Camera modes for the test area. No pilot view: the harvester has no
// interior by design, so the camera lives outside the machine — chase,
// orbit, and a capture-only 'free' viewpoint.

import { PerspectiveCamera, Vector3, Quaternion } from 'three'
import { OVERALL } from '../spec'
import type { CrawlerState } from '../contracts'

export type CameraMode = 'chase' | 'orbit' | 'free'
/** Only these two cycle on the C key; 'free' is reachable only from the
 *  capture harness, so a stray keypress cannot land the user in it. */
export const CAMERA_MODES: CameraMode[] = ['chase', 'orbit']

export interface CameraRig {
  camera: PerspectiveCamera
  mode: CameraMode
  cycle(): CameraMode
  setMode(mode: CameraMode): void
  /**
   * Park the camera on a sphere around the machine, for reference-matched
   * captures. azimuth 0 looks up the nose, 90 is the starboard flank;
   * elevation 90 is directly overhead. distance is in machine lengths.
   */
  setViewpoint(azimuthDeg: number, elevationDeg: number, distance: number): void
  update(state: Readonly<CrawlerState>, elapsed: number): void
  resize(width: number, height: number): void
}

const CHASE_BACK = OVERALL.length * 1.5
const CHASE_UP = OVERALL.length * 0.35
const ORBIT_RADIUS = OVERALL.length * 1.4
const ORBIT_HZ = 0.045

export function createCameraRig(targetRef: { getWorldPosition(v: Vector3): Vector3; getWorldQuaternion(q: Quaternion): Quaternion }): CameraRig {
  const camera = new PerspectiveCamera(52, 1, 0.25, 6000)
  let mode: CameraMode = 'chase'

  const scratch = new Vector3()
  const target = new Vector3()
  const free = { azimuth: -42, elevation: 24, distance: 1.7 }
  const freeRotation = new Quaternion()

  const apply = (next: CameraMode): void => {
    mode = next
    camera.fov = next === 'free' ? 52 : 52
    camera.updateProjectionMatrix()
  }
  apply(mode)

  return {
    camera,
    get mode() {
      return mode
    },
    cycle() {
      const next = CAMERA_MODES[(CAMERA_MODES.indexOf(mode) + 1) % CAMERA_MODES.length]
      apply(next)
      return next
    },
    setMode: apply,
    setViewpoint(azimuthDeg, elevationDeg, distance) {
      free.azimuth = azimuthDeg
      free.elevation = elevationDeg
      free.distance = distance
      if (mode !== 'free') apply('free')
    },
    update(state, elapsed) {
      const { position } = state
      target.set(position.x, position.y, position.z)

      if (mode === 'free') {
        // Target the machine's ACTUAL world position: the capture harness
        // parks it with debug.pose() and leaves the crawler state alone.
        targetRef.getWorldPosition(target)
        const az = (free.azimuth * Math.PI) / 180
        const el = (free.elevation * Math.PI) / 180
        const r = OVERALL.length * free.distance
        scratch.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az))
        scratch.applyQuaternion(targetRef.getWorldQuaternion(freeRotation))
        camera.position.set(
          target.x + scratch.x * r,
          target.y + scratch.y * r,
          target.z + scratch.z * r
        )
        camera.lookAt(target)
        return
      }

      if (mode === 'chase') {
        // Placed from the machine's actual heading, not from its velocity —
        // a crawler's velocity and heading agree by construction here.
        const fx = -Math.sin(state.yaw)
        const fz = -Math.cos(state.yaw)
        scratch.set(fx, 0, fz)
        camera.position.set(
          target.x - scratch.x * CHASE_BACK,
          target.y + CHASE_UP,
          target.z - scratch.z * CHASE_BACK
        )
      } else {
        const angle = elapsed * ORBIT_HZ * Math.PI * 2
        camera.position.set(
          target.x + Math.cos(angle) * ORBIT_RADIUS,
          target.y + OVERALL.length * 0.3,
          target.z + Math.sin(angle) * ORBIT_RADIUS
        )
      }
      camera.lookAt(target)
    },
    resize(width, height) {
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
    },
  }
}
