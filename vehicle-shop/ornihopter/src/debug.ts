// vehicle-shop/ornihopter/src/debug.ts
// The capture and measurement handle. This is the lead's instrument: every
// number in the bar that is not a unit test is read through here, so it has to
// let a headless browser place the craft and camera deterministically rather
// than screenshotting whatever frame the animation happened to be on.

import { Box3, Vector3 } from 'three'
import type { Object3D } from 'three'
import type { FlightModel } from './contracts'
import type { CameraRig, CameraMode } from './camera/cameraRig'
import type { Stage } from './stage/scene'
import type { CraftModel } from './contracts'

export interface DebugHandle {
  /** Freeze the sim so a capture is repeatable. */
  pause(): void
  resume(): void
  setCamera(mode: CameraMode): void
  /** Park the craft at a fixed pose for reference-matched renders. */
  pose(x: number, y: number, z: number, yawDeg: number, beatPhase: number): void
  /** Measured bounding box of the craft, for the scale question in the bar. */
  measure(): { span: number; length: number; height: number; ratio: number; triangles: number; meshes: number }
  state(): unknown
}

declare global {
  interface Window {
    __THOPTER__?: DebugHandle
  }
}

interface Deps {
  flight: FlightModel
  rig: CameraRig
  craft: CraftModel
  stage: Stage
}

export function installDebugHandle({ flight, rig, craft, stage }: Deps): void {
  let paused = false

  const handle: DebugHandle = {
    pause() {
      paused = true
    },
    resume() {
      paused = false
    },
    setCamera(mode) {
      rig.setMode(mode)
    },
    pose(x, y, z, yawDeg, beatPhase) {
      const root = craft.root as unknown as Object3D
      root.position.set(x, y, z)
      const half = (yawDeg * Math.PI) / 360
      root.quaternion.set(0, Math.sin(half), 0, Math.cos(half))
      craft.update({ ...(flight.state as object), beatPhase } as never)
      root.updateMatrixWorld(true)
    },
    measure() {
      const root = craft.root as unknown as Object3D
      root.updateMatrixWorld(true)
      const box = new Box3().setFromObject(root)
      const size = box.getSize(new Vector3())
      let triangles = 0
      let meshes = 0
      root.traverse((child: Object3D) => {
        const mesh = child as unknown as { isMesh?: boolean; geometry?: { index?: { count: number }; attributes?: { position?: { count: number } } } }
        if (!mesh.isMesh || !mesh.geometry) return
        meshes++
        const index = mesh.geometry.index
        const position = mesh.geometry.attributes?.position
        triangles += index ? index.count / 3 : position ? position.count / 3 : 0
      })
      return {
        span: size.x,
        length: size.z,
        height: size.y,
        ratio: size.z > 0 ? size.x / size.z : 0,
        triangles,
        meshes,
      }
    },
    state() {
      return JSON.parse(JSON.stringify(flight.state))
    },
  }

  // Paused frames still need to render, so the loop asks this rather than
  // being stopped outright.
  Object.defineProperty(handle, 'paused', { get: () => paused })
  void stage
  window.__THOPTER__ = handle
}
