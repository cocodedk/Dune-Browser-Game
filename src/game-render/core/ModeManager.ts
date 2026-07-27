// src/game-render/core/ModeManager.ts
// Owns scene-mode lifecycle: instantiate, update, dispose. Mode *selection* is
// delegated to the pure reducer in SceneModes.ts — this file only obeys it.
//
// Disposal discipline lives here. Vanilla three leaks geometry, materials and
// textures unless something explicitly frees them; every mode implements
// dispose() and this is the only place that calls it.

import type { Scene } from 'three'
import type { SceneModeId, WorldState } from '../../types'
import { EventBus } from '../../EventBus'
import { nextMode } from './SceneModes'
import type { EngineSignal } from './SceneModes'

export interface SceneMode {
  readonly id: SceneModeId
  readonly scene: Scene
  update(deltaMs: number, world: WorldState): void
  dispose(): void
  /**
   * Optional world-XZ hit test. Modes that have clickable content implement
   * it; the rest inherit "clicks do nothing", which is correct for a cinematic.
   */
  pickAt?(x: number, z: number): string | null
}

export type ModeFactory = () => SceneMode

export class ModeManager {
  private factories: Partial<Record<SceneModeId, ModeFactory>>
  private activeMode: SceneMode | null = null
  private previousId: SceneModeId = 'strategic'
  private warned = new Set<SceneModeId>()

  /** The live mode, for callers needing mode-specific behaviour like picking. */
  get active(): SceneMode | null {
    return this.activeMode
  }

  constructor(factories: Partial<Record<SceneModeId, ModeFactory>>) {
    this.factories = factories
  }

  get currentId(): SceneModeId {
    return this.activeMode?.id ?? 'strategic'
  }

  get scene(): Scene | null {
    return this.activeMode?.scene ?? null
  }

  /** Enter the starting mode. Safe to call once; later calls are no-ops. */
  start(id: SceneModeId = 'strategic'): void {
    if (this.activeMode) return
    this.enter(id)
  }

  /** Route an engine signal through the pure reducer and switch if needed. */
  handleSignal(signal: EngineSignal): void {
    const target = nextMode(this.currentId, signal, this.previousId)
    if (target === this.currentId) return
    this.enter(target)
  }

  update(deltaMs: number, world: WorldState): void {
    this.activeMode?.update(deltaMs, world)
  }

  dispose(): void {
    this.activeMode?.dispose()
    this.activeMode = null
  }

  private enter(id: SceneModeId): void {
    const factory = this.factories[id]

    // A mode with no registered factory falls back to strategic rather than
    // failing. This is what keeps the cinematic modes (Stages 12-14)
    // independently shippable — the game stays playable without them.
    if (!factory) {
      if (!this.warned.has(id)) {
        this.warned.add(id)
        console.warn(`[ModeManager] no factory for "${id}" — falling back to strategic`)
      }
      if (id !== 'strategic' && this.factories.strategic) {
        this.enter('strategic')
      }
      return
    }

    const outgoing = this.activeMode
    if (outgoing) this.previousId = outgoing.id

    this.activeMode = factory()
    outgoing?.dispose()

    EventBus.emit('scene:mode', { mode: this.activeMode.id })
  }
}
