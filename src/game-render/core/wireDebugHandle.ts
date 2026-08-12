// src/game-render/core/wireDebugHandle.ts
// The DebugSources wiring — split out of DebugHandle.ts (WP04 chunk W4b),
// which was at exactly 200/200 lines with no room left for the parity
// affordances (parityHash/replay/advanceTo/pauseForParity) that chunk's own
// scope requires. DebugHandle.ts keeps the TYPE surface (the DebugHandle
// interface itself, attach/detach); this file keeps the assignment wiring
// that populates it — the same split shape as debugSources.ts's own
// separation from ThreeContainer.

import type { Camera, Object3D } from 'three'
import type { Difficulty } from '../../types'
import { inspectScene } from './inspectScene'
import { inspectLights } from './inspectLights'
import type { DebugHandle } from './DebugHandle'

/** Everything the handle needs to observe, supplied by the render container. */
export interface DebugSources {
  audio: () => Record<string, unknown>
  setTime: (seconds: number) => void
  setVegetation: (value: number) => void
  worms: NonNullable<DebugHandle['worms']>
  signWorm: (fieldId: string) => void
  revealSites: () => void
  teleport: (villageId: string) => void
  giveHarvester: () => void
  giveEquipment: (kind: string) => void
  endRun: (ending: string) => void
  player: () => {
    state: string
    location: string
    travelTarget: string | null
    spice: number
    inDialogue: boolean
    difficulty: Difficulty
  }
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
  handle.giveHarvester = sources.giveHarvester
  handle.giveEquipment = sources.giveEquipment
  handle.endRun = sources.endRun
  handle.player = sources.player
  handle.inspect = () => {
    const scene = sources.scene()
    if (!scene) return []
    const { width, height } = sources.size()
    return inspectScene(scene, sources.camera(), width, height)
  }
  handle.lights = () => inspectLights(sources.scene(), sources.camera())
}
