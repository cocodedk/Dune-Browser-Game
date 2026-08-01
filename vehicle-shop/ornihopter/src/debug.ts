// vehicle-shop/ornihopter/src/debug.ts
// The capture and measurement handle. This is the lead's instrument: every
// number in the bar that is not a unit test is read through here, so it must
// let a headless browser place the craft and camera deterministically rather
// than screenshotting whatever frame the animation happened to land on.

import { Box3, Vector3 } from 'three'
import type { Object3D } from 'three'
import type { FlightModel, CraftModel } from './contracts'
import type { CameraRig, CameraMode } from './camera/cameraRig'

export interface CraftMeasurement {
  span: number
  length: number
  height: number
  spanOverLength: number
  triangles: number
  meshes: number
}

export interface DebugHandle {
  /** Freeze the sim. Frames still render, so a capture is repeatable. */
  pause(): void
  resume(): void
  isPaused(): boolean
  setCamera(mode: CameraMode): void
  /** Park the camera on a sphere around the craft, in the craft's own frame. */
  viewpoint(azimuthDeg: number, elevationDeg: number, distance: number): void
  /** Park the craft at a fixed pose and beat phase for matched renders. */
  pose(y: number, yawDeg: number, beatPhase: number): void
  measure(): CraftMeasurement
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
}

export function installDebugHandle({ flight, rig, craft }: Deps): DebugHandle {
  let paused = false
  const root = craft.root as unknown as Object3D

  const handle: DebugHandle = {
    pause() {
      paused = true
    },
    resume() {
      paused = false
    },
    isPaused() {
      return paused
    },
    setCamera(mode) {
      rig.setMode(mode)
    },
    viewpoint(azimuthDeg, elevationDeg, distance) {
      rig.setViewpoint(azimuthDeg, elevationDeg, distance)
    },
    pose(y, yawDeg, beatPhase) {
      paused = true
      const half = (yawDeg * Math.PI) / 360
      root.position.set(0, y, 0)
      root.quaternion.set(0, Math.sin(half), 0, Math.cos(half))
      craft.update({ ...flight.state, beatPhase })
      root.updateMatrixWorld(true)
    },
    measure() {
      root.updateMatrixWorld(true)
      const size = new Box3().setFromObject(root).getSize(new Vector3())
      let triangles = 0
      let meshes = 0
      root.traverse((child) => {
        const mesh = child as Object3D & {
          isMesh?: boolean
          geometry?: { index?: { count: number } | null; attributes?: { position?: { count: number } } }
        }
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
        spanOverLength: size.z > 0 ? size.x / size.z : 0,
        triangles,
        meshes,
      }
    },
    state() {
      return JSON.parse(JSON.stringify(flight.state))
    },
  }

  window.__THOPTER__ = handle
  return handle
}
