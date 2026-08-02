// vehicle-shop/harvester/src/debug.ts
// The capture and measurement handle. Every number in the bar that is not a
// unit test is read through here, so it must let a headless browser place
// the machine and camera deterministically rather than screenshotting
// whatever frame the animation happened to land on.

import { Box3, Vector3 } from 'three'
import type { Object3D } from 'three'
import type { CrawlerModel, HarvesterModel } from './contracts'
import type { CameraRig, CameraMode } from './camera/rig'
import { rideAt } from './crawler/kinematics'

export interface MachineMeasurement {
  span: number
  length: number
  height: number
  spanOverLength: number
  triangles: number
  meshes: number
}

export interface DebugHandle {
  pause(): void
  resume(): void
  isPaused(): boolean
  setCamera(mode: CameraMode): void
  /** Park the camera on a sphere around the machine, in its own frame. */
  viewpoint(azimuthDeg: number, elevationDeg: number, distance: number): void
  /** Park the machine at a ground position and heading, riding the terrain. */
  pose(x: number, z: number, yawDeg: number): void
  /** While paused, set BOTH tracks' signed speeds (m/s) to trackSpeed, so
   *  everything the animation reads (wheel spin today, belt scroll later)
   *  sees that speed. Forces paused so nothing else races the model. */
  drive(trackSpeed: number): void
  /** Advance the MODEL's animation by exactly dt seconds while paused and
   *  parked. The machine does not translate or change pose — only its
   *  animated parts (wheels, later the belt) move. Deterministic: dt is the
   *  only time input, never the wall clock, so identical (pose, drive, tick)
   *  sequences from a fresh page produce identical scene states. */
  tick(dt: number): void
  measure(): MachineMeasurement
  state(): unknown
}

declare global {
  interface Window {
    __HARVESTER__?: DebugHandle
  }
}

interface Deps {
  crawler: CrawlerModel
  rig: CameraRig
  machine: HarvesterModel
}

export function installDebugHandle({ crawler, rig, machine }: Deps): DebugHandle {
  let paused = false
  const root = machine.root as unknown as Object3D

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
    pose(x, z, yawDeg) {
      paused = true
      const yaw = (yawDeg * Math.PI) / 180
      const ride = rideAt(x, z, yaw)
      root.position.set(x, ride.y, z)
      root.rotation.order = 'YXZ'
      root.rotation.y = yaw
      root.rotation.x = ride.pitch
      root.rotation.z = ride.roll
      root.updateMatrixWorld(true)
    },
    drive(trackSpeed) {
      paused = true
      crawler.setTrackSpeeds(trackSpeed, trackSpeed)
    },
    tick(dt) {
      paused = true
      machine.update(crawler.state, dt)
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
      return JSON.parse(JSON.stringify(crawler.state))
    },
  }

  window.__HARVESTER__ = handle
  return handle
}
