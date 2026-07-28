// src/game-render/core/DebugHandle.ts
// window.__DUNE__ — the observation surface for Playwright.
//
// E2E must never assert on pixels: headless WebGL runs through SwiftShader and
// pixel comparison is both slow and flaky. Instead we expose the facts a test
// actually cares about — is it rendering, which mode, how many draw calls —
// and let assertions run against those.

import type { Camera, Object3D } from 'three'
import { Quaternion, Vector3 } from 'three'
import type { SceneModeId } from '../../types'

/** One object in the live scene, with where it actually lands on screen. */
export interface InspectedObject {
  name: string
  type: string
  visible: boolean
  /** World-space position. */
  world: [number, number, number]
  /** The object's local +Y in world space — its orientation, as a unit vector. */
  up: [number, number, number]
  /** Pixel position in the canvas, or null when behind the camera. */
  screen: [number, number] | null
  /** Approximate on-screen radius in pixels, from the bounding sphere. */
  screenRadius: number | null
}

export interface DebugHandle {
  mode: SceneModeId
  frame: number
  worldTime: number
  renderInfo: { calls: number; triangles: number }
  pick(id: string): void
  /** Populated by ThreeContainer; audio state for diagnosis. */
  audio?: () => Record<string, unknown>
  /**
   * Populated by ThreeContainer. Walks the live scene and reports where every
   * mesh actually lands on screen.
   *
   * This exists because "that object looks wrong" is not a diagnosis. Guessing
   * from a screenshot has cost this project whole sessions; reading the real
   * transform takes one call.
   */
  inspect?: () => InspectedObject[]
  /**
   * Populated by ThreeContainer. Scrubs the engine clock, so the whole day
   * cycle can be inspected without waiting a minute per rotation.
   */
  setTime?: (seconds: number) => void
  /**
   * Populated by ThreeContainer. A small snapshot of engine state, so a
   * driver script can tell "the click did nothing" from "the engine refused"
   * without reading the DOM.
   */
  player?: () => {
    state: string
    location: string
    travelTarget: string | null
    spice: number
    inDialogue: boolean
  }
}

declare global {
  interface Window {
    __DUNE__?: DebugHandle
  }
}

/**
 * Attach the handle. Enabled in dev, or in any build with `?debug=1`, so a
 * production bundle stays clean unless explicitly asked.
 */
export function shouldAttachDebug(): boolean {
  if (typeof window === 'undefined') return false
  if (import.meta.env?.DEV) return true
  return new URLSearchParams(window.location.search).has('debug')
}

export function attachDebugHandle(pick: (id: string) => void): DebugHandle | null {
  if (!shouldAttachDebug()) return null

  const handle: DebugHandle = {
    mode: 'strategic',
    frame: 0,
    worldTime: 0,
    renderInfo: { calls: 0, triangles: 0 },
    pick,
  }
  window.__DUNE__ = handle
  return handle
}

export function detachDebugHandle(): void {
  if (typeof window !== 'undefined') delete window.__DUNE__
}

/** Everything the handle needs to observe, supplied by the render container. */
export interface DebugSources {
  audio: () => Record<string, unknown>
  setTime: (seconds: number) => void
  player: NonNullable<DebugHandle['player']>
  scene: () => Object3D | null
  camera: () => Camera
  size: () => { width: number; height: number }
}

/** Attach the observation surface. No-op when debug is not enabled. */
export function wireDebugHandle(
  handle: DebugHandle | null,
  sources: DebugSources,
): void {
  if (!handle) return
  handle.audio = sources.audio
  handle.setTime = sources.setTime
  handle.player = sources.player
  handle.inspect = () => {
    const scene = sources.scene()
    if (!scene) return []
    const { width, height } = sources.size()
    return inspectScene(scene, sources.camera(), width, height)
  }
}

/**
 * Project every object in a scene to screen space.
 *
 * Meshes only — groups and lights have no visible extent, and listing them
 * just buries the thing being looked for.
 */
export function inspectScene(
  root: Object3D,
  camera: Camera,
  width: number,
  height: number,
): InspectedObject[] {
  const out: InspectedObject[] = []
  const world = new Vector3()
  const edge = new Vector3()
  const right = new Vector3()
  const up = new Vector3()
  const spin = new Quaternion()

  root.updateMatrixWorld(true)
  root.traverse(object => {
    const geometry = (object as { geometry?: { boundingSphere?: { radius: number } | null;
      computeBoundingSphere?: () => void } }).geometry
    if (!geometry) return

    object.getWorldPosition(world)
    const view = world.clone().project(camera)
    const behind = view.z > 1
    const screen: [number, number] | null = behind
      ? null
      : [(view.x * 0.5 + 0.5) * width, (-view.y * 0.5 + 0.5) * height]

    // Bounding-sphere radius, scaled by world scale, projected as an offset
    // from the centre — that is the on-screen size in pixels.
    //
    // The offset runs along the camera's right vector, not along all three
    // axes: offsetting diagonally and measuring only x overstates the radius
    // by root-3, which is exactly the kind of quietly-wrong number that sends
    // an investigation down the wrong road.
    let screenRadius: number | null = null
    if (!geometry.boundingSphere) geometry.computeBoundingSphere?.()
    const radius = geometry.boundingSphere?.radius
    if (radius != null && screen) {
      const scale = object.getWorldScale(new Vector3())
      const maxScale = Math.max(scale.x, scale.y, scale.z)
      right.setFromMatrixColumn(camera.matrixWorld, 0).normalize()
      edge.copy(world).addScaledVector(right, radius * maxScale).project(camera)
      screenRadius = Math.abs((edge.x - view.x) * 0.5 * width)
    }

    up.set(0, 1, 0).applyQuaternion(object.getWorldQuaternion(spin)).normalize()

    out.push({
      name: object.name || '(unnamed)',
      type: object.type,
      visible: object.visible,
      world: [world.x, world.y, world.z],
      up: [up.x, up.y, up.z],
      screen,
      screenRadius,
    })
  })
  return out
}
