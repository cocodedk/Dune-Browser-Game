// src/game-render/core/DebugHandle.ts
// window.__DUNE__ — the observation surface for Playwright.
//
// E2E must never assert on pixels: headless WebGL runs through SwiftShader and
// pixel comparison is both slow and flaky. Instead we expose the facts a test
// actually cares about — is it rendering, which mode, how many draw calls —
// and let assertions run against those.

import type { Camera, Object3D } from 'three'
import type { SceneModeId } from '../../types'
import { inspectScene } from './inspectScene'

export { inspectScene }

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
   * Populated by ThreeContainer. Forces every region's vegetation, so the
   * long ecology game can be inspected without playing sixty game-days for
   * each check.
   */
  setVegetation?: (value: number) => void
  /** Populated by ThreeContainer. Live worm sightings, for driver scripts. */
  worms?: () => { fieldId: string; atTime: number }[]
  /**
   * Populated by ThreeContainer. Stages a worm attack on a field.
   *
   * Worms only take crews working a *harvester*, which has to be bought from
   * the smugglers first — so reaching a real attack takes a long game, and
   * checking that the sign draws should not.
   */
  signWorm?: (fieldId: string) => void
  /** Populated by ThreeContainer. Reveals every deep-desert site at once. */
  revealSites?: () => void
  /**
   * Populated by ThreeContainer. Puts the player at a location outright.
   *
   * Travel range is deliberately tight early on, so reaching the far side of
   * the map to check that somebody is standing there takes most of a game.
   */
  teleport?: (villageId: string) => void
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
  setVegetation: (value: number) => void
  worms: NonNullable<DebugHandle['worms']>
  signWorm: (fieldId: string) => void
  revealSites: () => void
  teleport: (villageId: string) => void
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
  handle.setVegetation = sources.setVegetation
  handle.worms = sources.worms
  handle.signWorm = sources.signWorm
  handle.revealSites = sources.revealSites
  handle.teleport = sources.teleport
  handle.player = sources.player
  handle.inspect = () => {
    const scene = sources.scene()
    if (!scene) return []
    const { width, height } = sources.size()
    return inspectScene(scene, sources.camera(), width, height)
  }
}
