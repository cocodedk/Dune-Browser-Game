// vehicle-shop/ornihopter/src/camera/cameraRig.ts
// Camera modes for the test area. The pilot view is the one the bar cares
// about, so it is built the way that makes it correct by construction: the
// camera is PARENTED to the craft root at spec.PILOT_EYE, rather than having
// its world transform recomputed each frame from the craft's state. A parented
// camera cannot drift out of the seat, and cannot lag the craft by a frame.

import { PerspectiveCamera, Object3D, Vector3 } from 'three'
import { PILOT_EYE, OVERALL } from '../spec'
import type { FlightState } from '../contracts'

export type CameraMode = 'pilot' | 'chase' | 'orbit' | 'free'
/** Only these three cycle on the C key; 'free' is reachable only from the
 *  capture harness, so a stray keypress cannot land the user in it. */
export const CAMERA_MODES: CameraMode[] = ['pilot', 'chase', 'orbit']

export interface CameraRig {
  camera: PerspectiveCamera
  mode: CameraMode
  cycle(): CameraMode
  setMode(mode: CameraMode): void
  /**
   * Park the camera on a sphere around the craft, for reference-matched
   * captures. azimuth 0 looks at the craft's starboard flank, 90 looks up its
   * nose; elevation 90 is directly overhead. distance is in craft lengths.
   */
  setViewpoint(azimuthDeg: number, elevationDeg: number, distance: number): void
  update(state: Readonly<FlightState>, elapsed: number): void
  resize(width: number, height: number): void
}

const CHASE_BACK = OVERALL.length * 1.5
const CHASE_UP = OVERALL.length * 0.42
const ORBIT_RADIUS = OVERALL.span * 0.72
const ORBIT_HZ = 0.045

export function createCameraRig(craftRoot: Object3D): CameraRig {
  const camera = new PerspectiveCamera(62, 1, 0.25, 6000)
  let mode: CameraMode = 'pilot'

  // A dedicated node in the craft's own frame. The camera is attached to this
  // for pilot view and detached for the external views, so external views are
  // free to use world coordinates without fighting a parent transform.
  const seatNode = new Object3D()
  seatNode.position.set(PILOT_EYE.x, PILOT_EYE.y, PILOT_EYE.z)
  craftRoot.add(seatNode)

  const scratch = new Vector3()
  const target = new Vector3()

  const apply = (next: CameraMode) => {
    mode = next
    if (next === 'pilot') {
      seatNode.add(camera)
      camera.position.set(0, 0, 0)
      // Looking along the craft's own -Z, which spec.ts fixes as the nose.
      camera.rotation.set(0, 0, 0)
      camera.fov = 68
    } else {
      craftRoot.parent?.add(camera)
      camera.fov = 52
    }
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
    update(state, elapsed) {
      if (mode === 'pilot') return // parented; nothing to do.

      const { position } = state
      target.set(position.x, position.y, position.z)

      if (mode === 'chase') {
        // Placed from the craft's world heading, taken from its velocity when
        // it has one. Deriving the chase position from travel rather than from
        // the hull's own axes means a mis-modelled hull shows up as the craft
        // facing the wrong way on screen, instead of being hidden by a camera
        // that rotated along with the error.
        const speed = Math.hypot(state.velocity.x, state.velocity.y, state.velocity.z)
        if (speed > 0.5) {
          scratch.set(state.velocity.x, 0, state.velocity.z).normalize()
        } else {
          scratch.set(0, 0, 1)
        }
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
